import webpush from 'npm:web-push@3.6.7';
import { createClient } from 'npm:@supabase/supabase-js@2';

const cors={'Content-Type':'application/json'};

Deno.serve(async req=>{
  if(req.method!=='POST') return new Response(JSON.stringify({error:'POST required'}),{status:405,headers:cors});
  const secret=Deno.env.get('CANA_WEBHOOK_SECRET');
  if(secret && req.headers.get('x-cana-webhook-secret')!==secret) return new Response(JSON.stringify({error:'Unauthorized'}),{status:401,headers:cors});
  try{
    const payload=await req.json();
    const event=payload.record||payload;
    if(!event?.id) throw new Error('Notification event missing');
    const supabase=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
    const {data:row,error:eventError}=await supabase.from('notification_events').select('*').eq('id',event.id).maybeSingle();
    if(eventError) throw eventError;
    if(!row || row.status==='sent') return new Response(JSON.stringify({ok:true,duplicate:true}),{headers:cors});
    await supabase.from('notification_events').update({status:'processing'}).eq('id',row.id).eq('status','pending');
    const q=row.recipient_type==='admin'
      ? supabase.from('push_subscriptions').select('id,endpoint,p256dh,auth').not('user_id','is',null)
      : supabase.from('push_subscriptions').select('id,endpoint,p256dh,auth').eq('phone',row.customer_phone);
    const {data:subs,error:subError}=await q;
    if(subError) throw subError;
    webpush.setVapidDetails(Deno.env.get('VAPID_SUBJECT')!,Deno.env.get('VAPID_PUBLIC_KEY')!,Deno.env.get('VAPID_PRIVATE_KEY')!);
    let sent=0;
    for(const sub of subs||[]){
      try{
        await webpush.sendNotification({endpoint:sub.endpoint,keys:{p256dh:sub.p256dh,auth:sub.auth}},{title:row.title,body:row.body,tag:row.event_key,url:row.url});
        sent++;
      }catch(err){
        const status=err?.statusCode;
        if(status===404||status===410) await supabase.from('push_subscriptions').delete().eq('id',sub.id);
      }
    }
    await supabase.from('notification_events').update({status:'sent',processed_at:new Date().toISOString()}).eq('id',row.id);
    return new Response(JSON.stringify({ok:true,sent}),{headers:cors});
  }catch(error){
    console.error(error);
    return new Response(JSON.stringify({error:error instanceof Error?error.message:'Internal error'}),{status:500,headers:cors});
  }
});
