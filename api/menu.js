import { listJson } from '../lib/store.js';

export default async function handler(request) {
  if (request.method !== 'GET') return new Response('Method Not Allowed', { status: 405 });
  try {
    const date = new URL(request.url).searchParams.get('date');
    if (!date) return Response.json({ error: 'date requis' }, { status: 400 });
    const menus = await listJson('menus/');
    const now = Date.now();
    const menu = menus
      .filter(m => m.service_date === date && ['scheduled', 'published'].includes(m.status))
      .filter(m => !m.publish_at || new Date(m.publish_at).getTime() <= now)
      .sort((a, b) => String(b.updated_at || b.created_at).localeCompare(String(a.updated_at || a.created_at)))[0];
    return Response.json({ menu: menu || null });
  } catch (error) {
    console.error(error);
    return Response.json({ error: 'Impossible de charger le menu.' }, { status: 500 });
  }
}
