import crypto from 'node:crypto';
import { credentialsConfigured, credentialsMatch, createSessionCookie, clearSessionCookie, requireAuth } from '../lib/auth.js';
import { deleteObject, listJson, writeJson } from '../lib/store.js';

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', ...headers } });
}

async function getAll() {
  const [reservations, menus, dishes] = await Promise.all([listJson('reservations/'), listJson('menus/'), listJson('dishes/')]);
  reservations.sort((a,b) => (b.reservation_date + ' ' + b.reservation_time).localeCompare(a.reservation_date + ' ' + a.reservation_time));
  menus.sort((a,b) => String(a.service_date).localeCompare(String(b.service_date)));
  dishes.sort((a,b) => String(a.name).localeCompare(String(b.name), 'fr'));
  return { reservations, menus, dishes };
}

export default async function handler(request) {
  try {
    const url = new URL(request.url);
    const action = url.searchParams.get('action') || '';

    if (request.method === 'POST' && action === 'login') {
      if (!credentialsConfigured()) return json({ error: 'Administration non configurée. Définissez ADMIN_PHONE, ADMIN_PASSWORD et SESSION_SECRET dans Vercel.' }, 503);
      const body = await request.json();
      if (!credentialsMatch(body.phone, body.password)) return json({ error: 'Identifiants incorrects.' }, 401);
      return json({ ok: true }, 200, { 'Set-Cookie': createSessionCookie() });
    }

    if (request.method === 'POST' && action === 'logout') {
      return json({ ok: true }, 200, { 'Set-Cookie': clearSessionCookie() });
    }

    const denied = requireAuth(request);
    if (denied) return denied;

    if (request.method === 'GET') {
      if (action === 'overview') return json(await getAll());
      if (action === 'me') return json({ authenticated: true });
      return json({ error: 'Action inconnue.' }, 400);
    }

    if (request.method === 'POST') {
      const body = await request.json();
      if (action === 'dish') {
        const name = String(body.name || '').trim();
        const price = Number(body.price);
        if (!name || !Number.isFinite(price) || price < 0) return json({ error: 'Nom et prix requis.' }, 400);
        const id = crypto.randomUUID();
        const dish = { id, name, description: String(body.description || '').trim(), price, image_url: String(body.image_url || '').trim(), active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
        await writeJson('dishes/' + id + '.json', dish);
        return json({ dish }, 201);
      }
      if (action === 'menu') {
        const service_date = String(body.service_date || '');
        const publish_at = String(body.publish_at || '');
        if (!/^\d{4}-\d{2}-\d{2}$/.test(service_date) || !publish_at) return json({ error: 'Date et heure de publication requises.' }, 400);
        const menus = await listJson('menus/');
        const current = menus.find(m => m.service_date === service_date);
        const menu = { id: 'menu-' + service_date, service_date, publish_at, title: String(body.title || 'Menu du jour').trim(), status: String(body.status || 'scheduled'), items: current?.items || [], created_at: current?.created_at || new Date().toISOString(), updated_at: new Date().toISOString() };
        await writeJson('menus/' + service_date + '.json', menu);
        return json({ menu }, 201);
      }
      if (action === 'menu-item') {
        const menuDate = String(body.service_date || '');
        const dishId = String(body.dish_id || '');
        const [menus, dishes] = await Promise.all([listJson('menus/'), listJson('dishes/')]);
        const menu = menus.find(m => m.service_date === menuDate);
        const dish = dishes.find(d => d.id === dishId);
        if (!menu || !dish) return json({ error: 'Menu ou plat introuvable.' }, 404);
        menu.items = Array.isArray(menu.items) ? menu.items : [];
        if (!menu.items.some(i => i.dish_id === dish.id)) menu.items.push({ dish_id: dish.id, name: dish.name, description: dish.description, price: dish.price, image_url: dish.image_url, position: menu.items.length });
        menu.updated_at = new Date().toISOString();
        await writeJson('menus/' + menuDate + '.json', menu);
        return json({ menu });
      }
      if (action === 'push-subscription') {
        const sub = body.subscription || body;
        if (!sub?.endpoint || !sub?.keys?.p256dh || !sub?.keys?.auth) return json({ error: 'Abonnement push invalide.' }, 400);
        const id = crypto.createHash('sha256').update(sub.endpoint).digest('hex');
        await writeJson('push-subscriptions/' + id + '.json', { id, endpoint: sub.endpoint, keys: sub.keys, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
        return json({ ok: true });
      }
      return json({ error: 'Action inconnue.' }, 400);
    }

    if (request.method === 'PATCH') {
      const body = await request.json();
      if (action === 'reservation') {
        const id = String(body.id || '');
        const reservations = await listJson('reservations/');
        const reservation = reservations.find(r => r.id === id);
        if (!reservation) return json({ error: 'Réservation introuvable.' }, 404);
        if (!['pending', 'confirmed', 'cancelled', 'completed'].includes(body.status)) return json({ error: 'Statut invalide.' }, 400);
        reservation.status = body.status;
        reservation.updated_at = new Date().toISOString();
        await writeJson('reservations/' + id + '.json', reservation);
        return json({ reservation });
      }
      if (action === 'dish') {
        const id = String(body.id || '');
        const dishes = await listJson('dishes/');
        const dish = dishes.find(d => d.id === id);
        if (!dish) return json({ error: 'Plat introuvable.' }, 404);
        Object.assign(dish, { name: String(body.name ?? dish.name).trim(), description: String(body.description ?? dish.description).trim(), price: Number(body.price ?? dish.price), image_url: String(body.image_url ?? dish.image_url).trim(), active: body.active === undefined ? dish.active : Boolean(body.active), updated_at: new Date().toISOString() });
        await writeJson('dishes/' + id + '.json', dish);
        return json({ dish });
      }
      return json({ error: 'Action inconnue.' }, 400);
    }

    if (request.method === 'DELETE') {
      if (action === 'push-subscription') {
        const id = String(url.searchParams.get('id') || '');
        if (id) await deleteObject('push-subscriptions/' + id + '.json');
        return json({ ok: true });
      }
      return json({ error: 'Action inconnue.' }, 400);
    }

    return new Response('Method Not Allowed', { status: 405 });
  } catch (error) {
    console.error(error);
    return json({ error: 'Erreur serveur.' }, 500);
  }
}
