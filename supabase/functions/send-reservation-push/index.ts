import webpush from 'npm:web-push@3.6.7';
import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

webpush.setVapidDetails(
  Deno.env.get('VAPID_EMAIL')!,
  Deno.env.get('VAPID_PUBLIC_KEY')!,
  Deno.env.get('VAPID_PRIVATE_KEY')!
);

Deno.serve(async req => {
  try {
    const payload = await req.json();
    const reservation = payload.record || payload;
    if (!reservation?.id) return new Response('No reservation id', { status: 400 });

    const { data: row, error } = await supabase
      .from('reservations')
      .select('id,reservation_date,reservation_time,guests,customers(full_name,phone),dishes(name)')
      .eq('id', reservation.id)
      .single();
    if (error) throw error;

    const { data: subscriptions, error: subError } = await supabase
      .from('push_subscriptions')
      .select('endpoint,p256dh,auth');
    if (subError) throw subError;

    const customer = Array.isArray(row.customers) ? row.customers[0] : row.customers;
    const dish = Array.isArray(row.dishes) ? row.dishes[0] : row.dishes;
    const body = [
      customer?.full_name || 'Nouveau client',
      dish?.name ? '· '+dish.name : '',
      '· '+String(row.guests)+' pers.',
      '· '+String(row.reservation_time).slice(0,5)
    ].join(' ');

    const results = await Promise.allSettled((subscriptions || []).map(s =>
      webpush.sendNotification(
        { endpoint:s.endpoint, keys:{p256dh:s.p256dh, auth:s.auth} },
        JSON.stringify({
          title:'Nouvelle réservation',
          body,
          tag:'reservation-'+row.id,
          url:'/admin'
        })
      )
    ));

    const expired = (subscriptions || []).filter((s,i) => {
      const r=results[i];
      return r.status==='rejected' && [404,410].includes(r.reason?.statusCode);
    });
    if(expired.length) await supabase.from('push_subscriptions').delete().in('endpoint',expired.map(s=>s.endpoint));

    return Response.json({sent:results.filter(r=>r.status==='fulfilled').length,removed:expired.length});
  } catch (error) {
    console.error(error);
    return Response.json({error:String(error?.message||error)}, {status:500});
  }
});