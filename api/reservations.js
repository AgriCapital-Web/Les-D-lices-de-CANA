import crypto from 'node:crypto';
import webpush from 'web-push';
import { deleteObject, listJson, writeJson } from '../lib/store.js';

function normalizePhone(value) {
  return String(value || '').replace(/\s+/g, '').trim();
}

async function notifyAdmin(reservation) {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return;
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:contact@lesdelicesdecana.ci', publicKey, privateKey);
  const subscriptions = await listJson('push-subscriptions/');
  await Promise.all(subscriptions.map(async sub => {
    if (!sub.endpoint) return;
    try {
      await webpush.sendNotification(sub, JSON.stringify({
        title: 'Nouvelle réservation',
        body: reservation.full_name + ' · ' + reservation.guests + ' personne(s) · ' + reservation.reservation_date + ' à ' + reservation.reservation_time,
        tag: 'reservation-' + reservation.id,
        url: '/admin'
      }));
    } catch (error) {
      if ([404, 410].includes(error?.statusCode)) await deleteObject('push-subscriptions/' + sub.id + '.json');
      else console.error('Push error', error);
    }
  }));
}

export default async function handler(request) {
  try {
    if (request.method === 'POST') {
      const body = await request.json();
      const full_name = String(body.full_name || '').trim();
      const phone = normalizePhone(body.phone);
      const reservation_date = String(body.reservation_date || '');
      const reservation_time = String(body.reservation_time || '');
      const guests = Number(body.guests);
      if (!full_name || !phone || !/^\d{8,15}$/.test(phone) || !/^\d{4}-\d{2}-\d{2}$/.test(reservation_date) || !/^\d{2}:\d{2}$/.test(reservation_time) || !Number.isInteger(guests) || guests < 1 || guests > 20) {
        return Response.json({ error: 'Veuillez vérifier les informations de réservation.' }, { status: 400 });
      }
      const id = crypto.randomUUID();
      const reservation = {
        id, full_name, phone, reservation_date, reservation_time, guests,
        notes: String(body.notes || '').trim().slice(0, 1000),
        dish_id: body.dish_id || null, dish_name: body.dish_name || null,
        status: 'pending', created_at: new Date().toISOString(), updated_at: new Date().toISOString()
      };
      await writeJson('reservations/' + id + '.json', reservation);
      notifyAdmin(reservation).catch(error => console.error('Notification failed', error));
      return Response.json({ reservation: { id, status: reservation.status } }, { status: 201 });
    }

    if (request.method === 'GET') {
      const phone = normalizePhone(new URL(request.url).searchParams.get('phone'));
      if (!/^\d{8,15}$/.test(phone)) return Response.json({ error: 'Numéro de téléphone invalide.' }, { status: 400 });
      const reservations = await listJson('reservations/');
      const result = reservations.filter(r => normalizePhone(r.phone) === phone)
        .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
        .map(r => ({ id: r.id, reservation_date: r.reservation_date, reservation_time: r.reservation_time, guests: r.guests, status: r.status, notes: r.notes, dish_name: r.dish_name, created_at: r.created_at }));
      return Response.json({ reservations: result });
    }

    if (request.method === 'PATCH') {
      const body = await request.json();
      const id = String(body.id || '');
      const phone = normalizePhone(body.phone);
      if (!id || !/^\d{8,15}$/.test(phone)) return Response.json({ error: 'Informations invalides.' }, { status: 400 });
      const all = await listJson('reservations/');
      const reservation = all.find(r => r.id === id && normalizePhone(r.phone) === phone);
      if (!reservation) return Response.json({ error: 'Réservation introuvable.' }, { status: 404 });
      if (!['pending', 'confirmed'].includes(reservation.status)) return Response.json({ error: 'Cette réservation ne peut plus être annulée.' }, { status: 409 });
      reservation.status = 'cancelled';
      reservation.updated_at = new Date().toISOString();
      await writeJson('reservations/' + id + '.json', reservation);
      return Response.json({ ok: true });
    }

    return new Response('Method Not Allowed', { status: 405 });
  } catch (error) {
    console.error(error);
    return Response.json({ error: 'Le service de réservation est momentanément indisponible.' }, { status: 500 });
  }
}
