import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ChevronRight, CheckCircle2, X, MapPin, Phone, UtensilsCrossed, LogOut, Plus, Bell, CalendarDays } from 'lucide-react';
import './styles.css';

const DRINKS = ['Eau minérale', 'Boisson gazeuse', 'Jus naturel', 'Boisson fraîche'];
const api = async (url, options = {}) => {
  const response = await fetch(url, { credentials: 'same-origin', ...options, headers: { 'Content-Type': 'application/json', ...(options.headers || {}) } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Une erreur est survenue.');
  return data;
};
function money(v) { return new Intl.NumberFormat('fr-FR').format(Number(v || 0)) + ' FCFA'; }
function todayISO() { return new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Abidjan' }); }
function localDateLabel() { return new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }); }

function App() {
  const [menu, setMenu] = useState(null), [selected, setSelected] = useState(null), [lookup, setLookup] = useState(false), [phone, setPhone] = useState(''), [history, setHistory] = useState(null), [status, setStatus] = useState(''), [installPrompt, setInstallPrompt] = useState(null);
  useEffect(() => {
    const h = e => { e.preventDefault(); setInstallPrompt(e); };
    window.addEventListener('beforeinstallprompt', h);
    loadMenu();
    return () => window.removeEventListener('beforeinstallprompt', h);
  }, []);
  async function loadMenu() {
    try { const data = await api('/api/menu?date=' + encodeURIComponent(todayISO())); setMenu(data.menu); }
    catch (e) { setStatus(e.message); }
  }
  async function submitReservation(e) {
    e.preventDefault(); setStatus('');
    const fd = new FormData(e.currentTarget);
    const payload = { full_name: fd.get('full_name'), phone: fd.get('phone'), reservation_date: fd.get('date'), reservation_time: fd.get('time'), guests: Number(fd.get('guests')), notes: fd.get('notes'), dish_id: selected?.dish_id || null, dish_name: selected?.name || null };
    try { await api('/api/reservations', { method: 'POST', body: JSON.stringify(payload) }); setSelected(null); setStatus('success'); e.currentTarget.reset(); }
    catch (err) { setStatus(err.message); }
  }
  async function findReservations(e) {
    e.preventDefault(); setStatus('');
    try { const data = await api('/api/reservations?phone=' + encodeURIComponent(phone)); setHistory(data.reservations || []); }
    catch (err) { setStatus(err.message); }
  }
  async function cancelReservation(id) {
    try { await api('/api/reservations', { method: 'PATCH', body: JSON.stringify({ id, phone }) }); const data = await api('/api/reservations?phone=' + encodeURIComponent(phone)); setHistory(data.reservations || []); }
    catch (err) { setStatus(err.message); }
  }
  async function install() { if (installPrompt) { await installPrompt.prompt(); setInstallPrompt(null); } }
  const dishes = menu?.items || [];
  return <div className="app">
    <header className="topbar"><a href="#accueil" className="brand"><img src="/logo.svg" alt="Les Délices de CANA"/><span>Les Délices de CANA</span></a><nav><a href="#menu">Menu</a><a href="#reservation">Réserver</a><button onClick={() => { setHistory(null); setStatus(''); setLookup(true); }}>Ma réservation</button></nav></header>
    <main>
      <section id="accueil" className="hero"><div className="hero-copy"><span className="eyebrow">Gonaté · Cuisine & convivialité</span><h1>Les saveurs qui donnent envie de revenir.</h1><p>Découvrez le menu du jour, les plats disponibles et réservez simplement votre table.</p><div className="actions"><a className="btn primary" href="#menu">Voir le menu <ChevronRight size={18}/></a><a className="btn ghost" href="#reservation">Réserver une table</a></div>{installPrompt && <button className="install" onClick={install}>＋ Installer l'application</button>}</div><div className="hero-card"><img src="/logo.svg" alt=""/><div><strong>Menu du jour</strong><span>Publication automatique dès 06h00</span></div></div></section>
      <section id="menu" className="section"><div className="section-head"><div><span className="eyebrow">Aujourd'hui · {localDateLabel()}</span><h2>Le menu du jour</h2></div><span className="open"><span/> Ouvert</span></div>{dishes.length ? <div className="dish-grid">{dishes.map(d => <article className="dish" key={d.dish_id} onClick={() => setSelected(d)}><div className="dish-image">{d.image_url ? <img src={d.image_url} alt={d.name}/> : <UtensilsCrossed size={34}/>}<span>{money(d.price)}</span></div><div className="dish-body"><h3>{d.name}</h3><p>{d.description}</p><button>Réserver <ChevronRight size={16}/></button></div></article>)}</div> : <div className="empty public-empty"><UtensilsCrossed size={30}/><strong>Le menu du jour sera publié ici.</strong><span>Revenez dès la publication du menu par l'équipe.</span></div>}</section>
      <section className="drinks"><div><span className="eyebrow">Toujours disponibles</span><h2>Boissons fraîches</h2></div><div className="drink-list">{DRINKS.map(x => <span key={x}>{x}</span>)}</div></section>
      <section id="reservation" className="reservation-section"><div><span className="eyebrow">Votre table</span><h2>Réservez en quelques secondes.</h2><p>Indiquez votre heure de passage. L'équipe recevra votre demande immédiatement.</p><div className="contact"><span><MapPin size={18}/> Gonaté, Côte d’Ivoire</span><span><Phone size={18}/> Contact du restaurant</span></div></div><form className="reservation-form" onSubmit={submitReservation}><label>Nom complet<input name="full_name" required placeholder="Votre nom et prénom"/></label><label>Téléphone<input name="phone" required inputMode="tel" placeholder="07 00 00 00 00"/></label><div className="two"><label>Date<input name="date" type="date" required defaultValue={todayISO()}/></label><label>Heure<input name="time" type="time" required/></label></div><label>Nombre de personnes<select name="guests" defaultValue="2">{[1,2,3,4,5,6,7,8].map(n => <option key={n} value={n}>{n} personne{n > 1 ? 's' : ''}</option>)}</select></label><label>Précision (facultatif)<textarea name="notes" rows="2" placeholder="Une précision pour l'équipe..."/></label><button className="btn primary full">Confirmer ma réservation</button>{status === 'success' && <div className="success"><CheckCircle2/> Réservation enregistrée. L'équipe va la traiter.</div>}{status && status !== 'success' && <small className="error">{status}</small>}</form></section>
    </main>
    <footer><img src="/logo.svg" alt="Les Délices de CANA"/><span>© {new Date().getFullYear()} Les Délices de CANA · Gonaté</span><a href="/admin">Administration</a></footer>
    {selected && <div className="modal-backdrop" onClick={() => setSelected(null)}><div className="modal" onClick={e => e.stopPropagation()}><button className="close" onClick={() => setSelected(null)}><X/></button><span className="eyebrow">Réservation</span><h2>{selected.name}</h2><p>{selected.description}</p><strong className="modal-price">{money(selected.price)}</strong><a className="btn primary full" href="#reservation" onClick={() => setSelected(null)}>Continuer la réservation</a></div></div>}
    {lookup && <div className="modal-backdrop" onClick={() => setLookup(false)}><div className="modal wide" onClick={e => e.stopPropagation()}><button className="close" onClick={() => setLookup(false)}><X/></button><span className="eyebrow">Espace client</span><h2>Suivre ma réservation</h2>{!history ? <form onSubmit={findReservations}><p>Entrez le numéro utilisé lors de votre réservation.</p><label>Téléphone<input value={phone} onChange={e => setPhone(e.target.value)} required inputMode="tel" placeholder="07 00 00 00 00"/></label><button className="btn primary full">Afficher mes réservations</button>{status && <small className="error">{status}</small>}</form> : <div className="history">{history.length ? history.map(r => <div className="history-item" key={r.id}><div><strong>{r.dish_name || 'Réservation'}</strong><span>{r.reservation_date} · {String(r.reservation_time).slice(0,5)} · {r.guests} personne{r.guests > 1 ? 's' : ''}</span><em className={'badge ' + r.status}>{r.status}</em></div>{['pending','confirmed'].includes(r.status) && <button className="cancel" onClick={() => cancelReservation(r.id)}>Annuler</button>}</div>) : <p>Aucune réservation trouvée pour ce numéro.</p>}{status && <small className="error">{status}</small>}</div>}</div></div>}
  </div>;
}

function urlBase64ToUint8Array(base64String) { const padding = '='.repeat((4 - base64String.length % 4) % 4); const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/'); const raw = atob(base64); return Uint8Array.from([...raw].map(c => c.charCodeAt(0))); }
async function registerAdminPush() {
  const key = import.meta.env.VITE_VAPID_PUBLIC_KEY;
  if (!key || !('serviceWorker' in navigator) || !('PushManager' in window)) return;
  try {
    const permission = await Notification.requestPermission(); if (permission !== 'granted') return;
    const reg = await navigator.serviceWorker.ready;
    const existing = await reg.pushManager.getSubscription();
    const sub = existing || await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(key) });
    await api('/api/admin?action=push-subscription', { method: 'POST', body: JSON.stringify({ subscription: sub.toJSON() }) });
  } catch (err) { console.warn('Push notifications unavailable', err); }
}

function AdminApp() {
  const [logged, setLogged] = useState(false), [login, setLogin] = useState({ phone: '', password: '' }), [tab, setTab] = useState('reservations'), [data, setData] = useState({ reservations: [], menus: [], dishes: [] }), [form, setForm] = useState({ date: todayISO(), time: '06:00', title: '' }), [dishForm, setDishForm] = useState({ name: '', description: '', price: '', image_url: '' }), [message, setMessage] = useState(''), [loading, setLoading] = useState(true);
  useEffect(() => { checkSession(); }, []);
  async function checkSession() { try { await api('/api/admin?action=me'); setLogged(true); await refresh(); registerAdminPush(); } catch { setLogged(false); } finally { setLoading(false); } }
  async function signIn(e) { e.preventDefault(); setMessage(''); try { await api('/api/admin?action=login', { method: 'POST', body: JSON.stringify(login) }); setLogged(true); await refresh(); registerAdminPush(); } catch (err) { setMessage(err.message); } }
  async function logout() { await api('/api/admin?action=logout', { method: 'POST' }).catch(() => {}); setLogged(false); }
  async function refresh() { try { setData(await api('/api/admin?action=overview')); } catch (err) { setMessage(err.message); if (/accès/i.test(err.message)) setLogged(false); } }
  async function createDish(e) { e.preventDefault(); try { await api('/api/admin?action=dish', { method: 'POST', body: JSON.stringify(dishForm) }); setDishForm({ name: '', description: '', price: '', image_url: '' }); setMessage('Plat ajouté.'); refresh(); } catch (err) { setMessage(err.message); } }
  async function createMenu(e) { e.preventDefault(); try { await api('/api/admin?action=menu', { method: 'POST', body: JSON.stringify({ service_date: form.date, publish_at: new Date(form.date + 'T' + form.time + ':00+00:00').toISOString(), title: form.title || 'Menu du jour', status: 'scheduled' }) }); setMessage('Menu programmé.'); refresh(); } catch (err) { setMessage(err.message); } }
  async function addDish(service_date, dish_id) { try { await api('/api/admin?action=menu-item', { method: 'POST', body: JSON.stringify({ service_date, dish_id }) }); setMessage('Plat ajouté au menu.'); refresh(); } catch (err) { setMessage(err.message); } }
  async function updateStatus(id, status) { try { await api('/api/admin?action=reservation', { method: 'PATCH', body: JSON.stringify({ id, status }) }); refresh(); } catch (err) { setMessage(err.message); } }
  if (loading) return <div className="admin-login"><img src="/logo.svg" alt=""/><span className="eyebrow">Administration</span><h1>Chargement…</h1></div>;
  if (!logged) return <div className="admin-login"><img src="/logo.svg" alt="Les Délices de CANA"/><span className="eyebrow">Administration</span><h1>Accès équipe</h1><form onSubmit={signIn}><label>Téléphone<input value={login.phone} onChange={e => setLogin({ ...login, phone: e.target.value })} required/></label><label>Mot de passe<input type="password" value={login.password} onChange={e => setLogin({ ...login, password: e.target.value })} required/></label><button className="btn primary full">Se connecter</button>{message && <small className="error">{message}</small>}</form><a href="/">← Retour au restaurant</a></div>;
  return <div className="admin"><aside><img src="/logo.svg" alt=""/><button className={tab === 'reservations' ? 'active' : ''} onClick={() => setTab('reservations')}>Réservations</button><button className={tab === 'menus' ? 'active' : ''} onClick={() => setTab('menus')}>Menus programmés</button><button className={tab === 'dishes' ? 'active' : ''} onClick={() => setTab('dishes')}>Plats</button><button className="logout" onClick={logout}><LogOut size={16}/> Déconnexion</button></aside><section className="admin-main"><div className="admin-head"><div><span className="eyebrow">Les Délices de CANA</span><h1>Administration</h1></div><span className="live"><span/> Connecté</span></div>{message && <div className="notice">{message}</div>}
    {tab === 'reservations' && <div className="admin-card"><div className="card-title"><h2>Réservations</h2><button className="btn small" onClick={refresh}><Bell size={16}/> Actualiser</button></div>{data.reservations.length ? <div className="table-wrap"><table><thead><tr><th>Client</th><th>Date</th><th>Heure</th><th>Pers.</th><th>Plat</th><th>Statut</th></tr></thead><tbody>{data.reservations.map(r => <tr key={r.id}><td><strong>{r.full_name}</strong><small>{r.phone}</small></td><td>{r.reservation_date}</td><td>{String(r.reservation_time).slice(0,5)}</td><td>{r.guests}</td><td>{r.dish_name || '—'}</td><td><select value={r.status} onChange={e => updateStatus(r.id, e.target.value)}><option value="pending">En attente</option><option value="confirmed">Confirmée</option><option value="cancelled">Annulée</option><option value="completed">Terminée</option></select></td></tr>)}</tbody></table></div> : <p className="empty">Aucune réservation.</p>}</div>}
    {tab === 'menus' && <div className="admin-stack"><div className="admin-card"><h2>Programmer un menu</h2><form className="inline-form" onSubmit={createMenu}><label>Date<input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })}/></label><label>Publication<input type="time" value={form.time} onChange={e => setForm({ ...form, time: e.target.value })}/></label><label>Titre<input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Menu du jour"/></label><button className="btn primary"><CalendarDays size={16}/> Programmer</button></form><p className="hint">L'heure est interprétée en heure de Côte d'Ivoire (UTC+0).</p></div>{data.menus.map(m => <div className="admin-card" key={m.id}><div className="card-title"><div><h2>{m.title || 'Menu du jour'}</h2><span>{m.service_date} · {new Date(m.publish_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Abidjan' })}</span></div><span className={'badge ' + m.status}>{m.status}</span></div><div className="menu-items">{(m.items || []).map(item => <span key={item.dish_id}>{item.name}</span>)}</div><div className="menu-add"><select defaultValue="" onChange={e => { if (e.target.value) { addDish(m.service_date, e.target.value); e.target.value = ''; } }}><option value="">＋ Ajouter un plat</option>{data.dishes.filter(d => d.active && !(m.items || []).some(i => i.dish_id === d.id)).map(d => <option key={d.id} value={d.id}>{d.name} — {money(d.price)}</option>)}</select></div></div>)}</div>}
    {tab === 'dishes' && <div className="admin-stack"><div className="admin-card"><h2>Ajouter un plat</h2><form onSubmit={createDish}><label>Nom<input required value={dishForm.name} onChange={e => setDishForm({ ...dishForm, name: e.target.value })}/></label><label>Description<textarea value={dishForm.description} onChange={e => setDishForm({ ...dishForm, description: e.target.value })}/></label><label>Prix<input required type="number" min="0" value={dishForm.price} onChange={e => setDishForm({ ...dishForm, price: e.target.value })}/></label><label>URL image<input value={dishForm.image_url} onChange={e => setDishForm({ ...dishForm, image_url: e.target.value })} placeholder="https://…"/></label><button className="btn primary"><Plus size={16}/> Ajouter</button></form></div><div className="admin-card"><h2>Bibliothèque des plats</h2>{data.dishes.map(d => <div className="dish-row" key={d.id}><div><strong>{d.name}</strong><span>{d.description}</span></div><b>{money(d.price)}</b></div>)}</div></div>}
  </section></div>;
}

createRoot(document.getElementById('root')).render(location.pathname.startsWith('/admin') ? <AdminApp/> : <App/>);
