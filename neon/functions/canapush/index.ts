import webpush from 'web-push';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 3 });
const cors = {'content-type':'application/json','access-control-allow-origin':'*','access-control-allow-methods':'POST,OPTIONS','access-control-allow-headers':'content-type'};

async function apiRequest(req) {
  const body = await req.json();
  const action = typeof body?.p_action === 'string' ? body.p_action : '';
  const payload = body?.p_payload && typeof body.p_payload === 'object' ? body.p_payload : {};
  const session = typeof body?.p_session === 'string' && body.p_session ? body.p_session : null;
  if (!action) return new Response(JSON.stringify({error:'p_action required'}),{status:400,headers:cors});
  const client=await pool.connect();
  try {
    const result=await client.query('select public.cana_api($1,$2::jsonb,$3) as data',[action,JSON.stringify(payload),session]);
    return new Response(JSON.stringify(result.rows[0]?.data ?? null),{status:200,headers:cors});
  } finally { client.release(); }
}

async function pushWorker() {
  const client=await pool.connect();
  try {
    const settings=await client.query("select key,value from public.app_settings where key in ('vapid_subject','vapid_public_key','vapid_private_key')");
    const cfg=Object.fromEntries(settings.rows.map(r=>[r.key,r.value]));
    webpush.setVapidDetails(cfg.vapid_subject,cfg.vapid_public_key,cfg.vapid_private_key);
    const events=await client.query("select * from public.notification_events where status in ('pending','failed') and attempts<5 order by created_at asc limit 25");
    let sentEvents=0;
    for(const event of events.rows){
      await client.query("update public.notification_events set status='processing',attempts=attempts+1 where id=$1 and status in ('pending','failed')",[event.id]);
      const subs=event.recipient_type==='admin'
        ? await client.query("select id,endpoint,p256dh,auth from public.push_subscriptions where admin_user_id is not null")
        : await client.query("select id,endpoint,p256dh,auth from public.push_subscriptions where phone=$1",[event.customer_phone]);
      let sent=0;
      for(const sub of subs.rows){
        try{await webpush.sendNotification({endpoint:sub.endpoint,keys:{p256dh:sub.p256dh,auth:sub.auth}},JSON.stringify({title:event.title,body:event.body,tag:event.event_key,url:event.url,renotify:false}));sent++;}
        catch(err){if(err?.statusCode===404||err?.statusCode===410)await client.query("delete from public.push_subscriptions where id=$1",[sub.id]);}
      }
      await client.query("update public.notification_events set status=$2,processed_at=case when $2='sent' then now() else null end where id=$1",[event.id,sent>0?'sent':'failed']);
      if(sent>0)sentEvents++;
    }
    return {ok:true,events:sentEvents};
  } finally {client.release();}
}

export default async function handler(req) {
  if(req.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
  try{
    if(req.method!=='POST')return new Response(JSON.stringify({error:'POST required'}),{status:405,headers:cors});
    const contentType=req.headers.get('content-type')||'';
    if(contentType.includes('application/json')){
      const clone=req.clone();
      try{const body=await clone.json();if(body?.p_action)return await apiRequest(req);}catch{}
    }
    return new Response(JSON.stringify(await pushWorker()),{status:200,headers:cors});
  }catch(e){return new Response(JSON.stringify({error:e?.message||'CANA API error'}),{status:500,headers:cors});}
}