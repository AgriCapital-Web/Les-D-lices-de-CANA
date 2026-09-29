import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { supabase } from './supabase';
import { ChevronRight, CheckCircle2, X, MapPin, Phone, UtensilsCrossed, LogOut, Plus, Bell, CalendarDays, Clock3 } from 'lucide-react';
import './styles.css';

const DEMO_DISHES=[
  {id:'d1',name:'Poulet braisé',description:'Poulet braisé, accompagnement du jour et condiments.',price:3500,image:''},
  {id:'d2',name:'Poisson braisé',description:'Poisson braisé servi avec accompagnement du jour.',price:4000,image:''},
  {id:'d3',name:'Sauce graine',description:'Sauce graine maison, viande ou poisson selon disponibilité.',price:3500,image:''},
  {id:'d4',name:'Sauce aubergine',description:'Aubergine mijotée façon maison, accompagnement du jour.',price:3000,image:''},
  {id:'d5',name:'Poulet frit',description:'Poulet croustillant, servi avec accompagnement.',price:3500,image:''},
  {id:'d6',name:'Soupe de cabri',description:'Soupe généreuse préparée façon maison.',price:4000,image:''}
];
const DRINKS=['Eau minérale','Boisson gazeuse','Jus naturel','Boisson fraîche'];

function money(v){return new Intl.NumberFormat('fr-FR').format(v)+' FCFA';}
function todayISO(){return new Date().toLocaleDateString('en-CA',{timeZone:'Africa/Abidjan'});}
function localDateLabel(){return new Date().toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long'});}
function App(){
  const [menu,setMenu]=useState(DEMO_DISHES),[selected,setSelected]=useState(null),[lookup,setLookup]=useState(false),[phone,setPhone]=useState(''),[history,setHistory]=useState(null),[status,setStatus]=useState(''),[installPrompt,setInstallPrompt]=useState(null);
  useEffect(()=>{const h=e=>{e.preventDefault();setInstallPrompt(e)};window.addEventListener('beforeinstallprompt',h);loadMenu();return()=>window.removeEventListener('beforeinstallprompt',h)},[]);
  async function loadMenu(){
    if(!supabase)return;
    const {data,error}=await supabase.from('menu_items').select('id,dish_id,name,description,price,image_url,menus!inner(service_date,publish_at,status)').eq('menus.service_date',todayISO()).in('menus.status',['scheduled','published']).lte('menus.publish_at',new Date().toISOString()).order('position');
    if(!error&&data?.length)setMenu(data.map(x=>({id:x.id,dishId:x.dish_id,name:x.name,description:x.description,price:x.price,image:x.image_url})));
  }
  async function submitReservation(e){
    e.preventDefault();setStatus('');
    const fd=new FormData(e.currentTarget);
    const p={full_name:fd.get('full_name'),phone:fd.get('phone'),reservation_date:fd.get('date'),reservation_time:fd.get('time'),guests:Number(fd.get('guests')),notes:fd.get('notes'),dish_id:selected?.dishId||null};
    if(supabase){const {error}=await supabase.rpc('create_public_reservation',{p_full_name:p.full_name,p_phone:p.phone,p_reservation_date:p.reservation_date,p_reservation_time:p.reservation_time,p_guests:p.guests,p_notes:p.notes||null,p_dish_id:p.dish_id});if(error){setStatus(error.message);return;}}
    setSelected(null);setStatus('success');e.currentTarget.reset();
  }
  async function findReservations(e){
    e.preventDefault();setStatus('');
    if(!supabase){setHistory([]);setLookup(false);setStatus('demo');return;}
    const {data,error}=await supabase.rpc('get_public_reservations',{p_phone:phone});
    if(error){setStatus(error.message);return;}setHistory(data||[]);setLookup(false);
  }
  async function cancelReservation(id){
    if(!supabase)return;
    const {error}=await supabase.rpc('cancel_public_reservation',{p_reservation_id:id,p_phone:phone});
    if(error){setStatus(error.message);return;}
    const {data}=await supabase.rpc('get_public_reservations',{p_phone:phone});setHistory(data||[]);
  }
  async function install(){if(installPrompt){await installPrompt.prompt();setInstallPrompt(null);}}
  return <div className="app">
    <header className="topbar"><a href="#accueil" className="brand"><img src="/logo.svg" alt="Les Délices de CANA"/><span>Les Délices de CANA</span></a><nav><a href="#menu">Menu</a><a href="#reservation">Réserver</a><button onClick={()=>setLookup(true)}>Ma réservation</button></nav></header>
    <main>
      <section id="accueil" className="hero"><div className="hero-copy"><span className="eyebrow">Gonaté · Cuisine & convivialité</span><h1>Les saveurs qui donnent envie de revenir.</h1><p>Découvrez le menu du jour, les plats disponibles et réservez simplement votre table.</p><div className="actions"><a className="btn primary" href="#menu">Voir le menu <ChevronRight size={18}/></a><a className="btn ghost" href="#reservation">Réserver une table</a></div>{installPrompt&&<button className="install" onClick={install}>＋ Installer l'application</button>}</div><div className="hero-card"><img src="/logo.svg" alt=""/><div><strong>Menu du jour</strong><span>Publication automatique dès 06h00</span></div></div></section>
      <section id="menu" className="section"><div className="section-head"><div><span className="eyebrow">Aujourd'hui · {localDateLabel()}</span><h2>Le menu du jour</h2></div><span className="open"><span/> Ouvert</span></div><div className="dish-grid">{menu.map(d=><article className="dish" key={d.id} onClick={()=>setSelected(d)}><div className="dish-image">{d.image?<img src={d.image} alt={d.name}/>:<UtensilsCrossed size={34}/>}<span>{money(d.price)}</span></div><div className="dish-body"><h3>{d.name}</h3><p>{d.description}</p><button>Réserver <ChevronRight size={16}/></button></div></article>)}</div></section>
      <section className="drinks"><div><span className="eyebrow">Toujours disponibles</span><h2>Boissons fraîches</h2></div><div className="drink-list">{DRINKS.map(x=><span key={x}>{x}</span>)}</div></section>
      <section id="reservation" className="reservation-section"><div><span className="eyebrow">Votre table</span><h2>Réservez en quelques secondes.</h2><p>Indiquez votre heure de passage. L'équipe recevra votre demande immédiatement.</p><div className="contact"><span><MapPin size={18}/> Gonaté, Côte d’Ivoire</span><span><Phone size={18}/> Contact du restaurant</span></div></div><form className="reservation-form" onSubmit={submitReservation}><label>Nom complet<input name="full_name" required placeholder="Votre nom et prénom"/></label><label>Téléphone<input name="phone" required inputMode="tel" placeholder="07 00 00 00 00"/></label><div className="two"><label>Date<input name="date" type="date" required defaultValue={todayISO()}/></label><label>Heure<input name="time" type="time" required/></label></div><label>Nombre de personnes<select name="guests" defaultValue="2">{[1,2,3,4,5,6,7,8].map(n=><option key={n} value={n}>{n} personne{n>1?'s':''}</option>)}</select></label><label>Précision (facultatif)<textarea name="notes" rows="2" placeholder="Une précision pour l'équipe..."/></label><button className="btn primary full">Confirmer ma réservation</button>{status==='success'&&<div className="success"><CheckCircle2/> Réservation enregistrée. L'équipe va la traiter.</div>}{status&&status!=='success'&&status!=='demo'&&<small className="error">{status}</small>}</form></section>
    </main>
    <footer><img src="/logo.svg" alt="Les Délices de CANA"/><span>© {new Date().getFullYear()} Les Délices de CANA · Gonaté</span><a href="/admin">Administration</a></footer>
    {selected&&<div className="modal-backdrop" onClick={()=>setSelected(null)}><div className="modal" onClick={e=>e.stopPropagation()}><button className="close" onClick={()=>setSelected(null)}><X/></button><span className="eyebrow">Réservation</span><h2>{selected.name}</h2><p>{selected.description}</p><strong className="modal-price">{money(selected.price)}</strong><a className="btn primary full" href="#reservation" onClick={()=>setSelected(null)}>Continuer la réservation</a></div></div>}
    {lookup&&<div className="modal-backdrop" onClick={()=>setLookup(false)}><div className="modal wide" onClick={e=>e.stopPropagation()}><button className="close" onClick={()=>setLookup(false)}><X/></button><span className="eyebrow">Espace client</span><h2>Suivre ma réservation</h2>{!history?<form onSubmit={findReservations}><p>Entrez le numéro utilisé lors de votre réservation.</p><label>Téléphone<input value={phone} onChange={e=>setPhone(e.target.value)} required inputMode="tel" placeholder="07 00 00 00 00"/></label><button className="btn primary full">Afficher mes réservations</button></form>:<div className="history">{history.length?history.map(r=><div className="history-item" key={r.id}><div><strong>{r.dish_name||'Réservation'}</strong><span>{r.reservation_date} · {String(r.reservation_time).slice(0,5)} · {r.guests} personne{r.guests>1?'s':''}</span><em className={'badge '+r.status}>{r.status}</em></div>{['pending','confirmed'].includes(r.status)&&<button className="cancel" onClick={()=>cancelReservation(r.id)}>Annuler</button>}</div>):<p>Aucune réservation trouvée pour ce numéro.</p>}</div>}</div></div>}
  </div>
}

async function registerAdminPush(){
  if(!supabase || !('serviceWorker' in navigator) || !('PushManager' in window) || !import.meta.env.VITE_VAPID_PUBLIC_KEY) return;
  try{
    const permission=await Notification.requestPermission();
    if(permission!=='granted') return;
    const reg=await navigator.serviceWorker.ready;
    const existing=await reg.pushManager.getSubscription();
    const sub=existing||await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:urlBase64ToUint8Array(import.meta.env.VITE_VAPID_PUBLIC_KEY)});
    const json=sub.toJSON();
    await supabase.from('push_subscriptions').upsert({user_id:(await supabase.auth.getUser()).data.user?.id,endpoint:json.endpoint,p256dh:json.keys?.p256dh,auth:json.keys?.auth},{onConflict:'endpoint'});
  }catch(err){console.warn('Push notifications unavailable',err);}
}
function urlBase64ToUint8Array(base64String){
  const padding='='.repeat((4-base64String.length%4)%4);
  const base64=(base64String+padding).replace(/-/g,'+').replace(/_/g,'/');
  const raw=atob(base64); return Uint8Array.from([...raw].map(c=>c.charCodeAt(0)));
}

function AdminApp(){
  const [session,setSession]=useState(null),[login,setLogin]=useState({phone:'',password:''}),[tab,setTab]=useState('reservations'),[reservations,setReservations]=useState([]),[menus,setMenus]=useState([]),[dishes,setDishes]=useState([]),[form,setForm]=useState({date:todayISO(),time:'06:00',title:''}),[dishForm,setDishForm]=useState({name:'',description:'',price:'',image_url:''}),[message,setMessage]=useState('');
  useEffect(()=>{if(!supabase)return;supabase.auth.getSession().then(({data})=>{setSession(data.session);if(data.session){refresh();registerAdminPush()}});const {data:{subscription}}=supabase.auth.onAuthStateChange((_e,s)=>{setSession(s);if(s){refresh();registerAdminPush()}});return()=>subscription.unsubscribe()},[]);
  async function signIn(e){e.preventDefault();setMessage('');if(!supabase){setMessage('Supabase n’est pas configuré.');return;}const {data,error}=await supabase.auth.signInWithPassword({phone:login.phone,password:login.password});if(error)setMessage(error.message);else setSession(data.session);}
  async function refresh(){
    const [r,m,d]=await Promise.all([
      supabase.from('reservations').select('id,reservation_date,reservation_time,guests,status,notes,customers(full_name,phone),dishes(name)').order('reservation_date',{ascending:false}).order('reservation_time',{ascending:false}).limit(100),
      supabase.from('menus').select('*').order('service_date',{ascending:true}),
      supabase.from('dishes').select('*').order('name')
    ]);
    setReservations(r.data||[]);setMenus(m.data||[]);setDishes(d.data||[]);
  }
  async function createDish(e){e.preventDefault();const {error}=await supabase.from('dishes').insert({name:dishForm.name,description:dishForm.description||null,price:Number(dishForm.price),image_url:dishForm.image_url||null}).select().single();if(error)setMessage(error.message);else{setDishForm({name:'',description:'',price:'',image_url:''});setMessage('Plat ajouté.');refresh();}}
  async function createMenu(e){e.preventDefault();const publishAt=new Date(form.date+'T'+form.time+':00+00:00').toISOString();const {error}=await supabase.from('menus').upsert({service_date:form.date,publish_at:publishAt,status:'scheduled',title:form.title||'Menu du jour'},{onConflict:'service_date'});if(error){setMessage(error.message);return;}setMessage('Menu programmé.');refresh();}
  async function addDish(menuId,dish){const {error}=await supabase.from('menu_items').insert({menu_id:menuId,dish_id:dish.id,name:dish.name,description:dish.description,price:dish.price,image_url:dish.image_url,position:0});setMessage(error?error.message:'Plat ajouté au menu.');}
  if(session) { /* push permission is requested only inside the authenticated back-office */ }\n  if(!session)return <div className="admin-login"><img src="/logo.svg" alt="Les Délices de CANA"/><span className="eyebrow">Administration</span><h1>Accès équipe</h1><form onSubmit={signIn}><label>Téléphone<input value={login.phone} onChange={e=>setLogin({...login,phone:e.target.value})} required/></label><label>Mot de passe<input type="password" value={login.password} onChange={e=>setLogin({...login,password:e.target.value})} required/></label><button className="btn primary full">Se connecter</button>{message&&<small className="error">{message}</small>}</form><a href="/">← Retour au restaurant</a></div>;
  return <div className="admin"><aside><img src="/logo.svg" alt=""/><button className={tab==='reservations'?'active':''} onClick={()=>setTab('reservations')}>Réservations</button><button className={tab==='menus'?'active':''} onClick={()=>setTab('menus')}>Menus programmés</button><button className={tab==='dishes'?'active':''} onClick={()=>setTab('dishes')}>Plats</button><button className="logout" onClick={()=>supabase.auth.signOut()}><LogOut size={16}/> Déconnexion</button></aside><section className="admin-main"><div className="admin-head"><div><span className="eyebrow">Les Délices de CANA</span><h1>Administration</h1></div><span className="live"><span/> Connecté</span></div>{message&&<div className="notice">{message}</div>}{tab==='reservations'&&<div className="admin-card"><div className="card-title"><h2>Réservations</h2><button className="btn small" onClick={refresh}><Bell size={16}/> Actualiser</button></div>{reservations.length?<div className="table-wrap"><table><thead><tr><th>Client</th><th>Date</th><th>Heure</th><th>Pers.</th><th>Plat</th><th>Statut</th></tr></thead><tbody>{reservations.map(r=><tr key={r.id}><td><strong>{r.customers?.full_name}</strong><small>{r.customers?.phone}</small></td><td>{r.reservation_date}</td><td>{String(r.reservation_time).slice(0,5)}</td><td>{r.guests}</td><td>{r.dishes?.name||'—'}</td><td><span className={'badge '+r.status}>{r.status}</span></td></tr>)}</tbody></table></div>:<p className="empty">Aucune réservation.</p>}</div>}{tab==='menus'&&<div className="admin-stack"><div className="admin-card"><h2>Programmer un menu</h2><form className="inline-form" onSubmit={createMenu}><label>Date<input type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})}/></label><label>Publication<input type="time" value={form.time} onChange={e=>setForm({...form,time:e.target.value})}/></label><label>Titre<input value={form.title} onChange={e=>setForm({...form,title:e.target.value})} placeholder="Menu du jour"/></label><button className="btn primary"><CalendarDays size={16}/> Programmer</button></form><p className="hint">La publication est normalement réglée à 06h00. Le site ne montre que les menus dont la date et l'heure de publication sont atteintes.</p></div>{menus.map(m=><div className="admin-card" key={m.id}><div className="card-title"><div><h2>{m.title||'Menu du jour'}</h2><span>{m.service_date} · {new Date(m.publish_at).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}</span></div><span className={'badge '+m.status}>{m.status}</span></div><div className="menu-add"><select onChange={e=>{const d=dishes.find(x=>x.id===e.target.value);if(d){addDish(m.id,d);e.target.value=''}}}><option value="">＋ Ajouter un plat</option>{dishes.filter(d=>d.active).map(d=><option key={d.id} value={d.id}>{d.name} — {money(d.price)}</option>)}</select></div></div>)}</div>}{tab==='dishes'&&<div className="admin-stack"><div className="admin-card"><h2>Ajouter un plat</h2><form onSubmit={createDish}><label>Nom<input required value={dishForm.name} onChange={e=>setDishForm({...dishForm,name:e.target.value})}/></label><label>Description<textarea value={dishForm.description} onChange={e=>setDishForm({...dishForm,description:e.target.value})}/></label><label>Prix<input required type="number" min="0" value={dishForm.price} onChange={e=>setDishForm({...dishForm,price:e.target.value})}/></label><label>URL image (temporaire)<input value={dishForm.image_url} onChange={e=>setDishForm({...dishForm,image_url:e.target.value})}/></label><button className="btn primary"><Plus size={16}/> Ajouter</button></form></div><div className="admin-card"><h2>Bibliothèque des plats</h2>{dishes.map(d=><div className="dish-row" key={d.id}><div><strong>{d.name}</strong><span>{d.description}</span></div><b>{money(d.price)}</b></div>)}</div></div>}</section></div>
}

createRoot(document.getElementById('root')).render(location.pathname.startsWith('/admin')?<AdminApp/>:<App/>);