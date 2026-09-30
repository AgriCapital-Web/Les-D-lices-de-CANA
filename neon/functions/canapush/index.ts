import webpush from 'web-push';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 3 });

export default async function handler(req) {
  if (req.method !== 'POST') return new Response(JSON.stringify({error:'POST required'}),{status:405,headers:{'content-type':'application/json'}});
  try {
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
          try{
            await webpush.sendNotification({endpoint:sub.endpoint,keys:{p256dh:sub.p256dh,auth:sub.auth}},JSON.stringify({title:event.title,body:event.body,tag:event.event_key,url:event.url,renotify:false}));
            sent++;
          }catch(err){
            if(err?.statusCode===404||err?.statusCode===410) await client.query("delete from public.push_subscriptions where id=$1",[sub.id]);
          }
        }
        await client.query("update public.notification_events set status=$2,processed_at=case when $2='sent' then now() else null end where id=$1",[event.id,sent>0?'sent':'failed']);
        if(sent>0) sentEvents++;
      }
      return new Response(JSON.stringify({ok:true,events:sentEvents}),{headers:{'content-type':'application/json'}});
    } finally { client.release(); }
  } catch(e) {
    return new Response(JSON.stringify({error:e?.message||'Push worker error'}),{status:500,headers:{'content-type':'application/json'}});
  }
}