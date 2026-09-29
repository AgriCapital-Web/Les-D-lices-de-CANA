import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { supabase } from './supabase';
import { Bell, CalendarDays, Clock3, MapPin, Phone, UserRound, X, ChevronRight, UtensilsCrossed, Search, CheckCircle2 } from 'lucide-react';
import './styles.css';

const DEMO_DISHES = [
  { id:'d1', name:'Poulet braisé', description:'Poulet braisé, accompagnement du jour et condiments.', price:3500, image:'' },
  { id:'d2', name:'Poisson braisé', description:'Poisson braisé servi avec accompagnement du jour.', price:4000, image:'' },
  { id:'d3', name:'Sauce graine', description:'Sauce graine maison, viande ou poisson selon disponibilité.', price:3500, image:'' },
  { id:'d4', name:'Sauce aubergine', description:'Aubergine mijotée façon maison, accompagnement du jour.', price:3000, image:'' },
  { id:'d5', name:'Poulet frit', description:'Poulet croustillant, servi avec accompagnement.', price:3500, image:'' },
  { id:'d6', name:'Soupe de cabri', description:'Soupe généreuse préparée façon maison.', price:4000, image:'' }
];
const DRINKS = ['Eau minérale','Boisson gazeuse','Jus naturel','Boisson fraîche'];

function money(v){ return new Intl.NumberFormat('fr-FR').format(v)+' FCFA'; }
function todayISO(){ return new Date().toLocaleDateString('en-CA',{timeZone:'Africa/Abidjan'}); }

function App(){
  const [menu,setMenu]=useState(DEMO_DISHES);
  const [selected,setSelected]=useState(null);
  const [reservation,setReservation]=useState(null);
  const [lookup,setLookup]=useState(false);
  const [phone,setPhone]=useState('');
  const [status,setStatus]=useState('');
  const [installPrompt,setInstallPrompt]=useState(null);

  useEffect(()=>{
    window.addEventListener('beforeinstallprompt', e=>{e.preventDefault();setInstallPrompt(e)});
    loadMenu();
  },[]);

  async function loadMenu(){
    if(!supabase) return;
    const {data,error}=await supabase.from('menu_items').select('id,name,description,price,image_url,menus!inner(service_date,publish_at,status)').eq('menus.service_date',todayISO()).eq('menus.status','published').lte('menus.publish_at',new Date().toISOString()).order('position');
    if(!error && data?.length) setMenu(data.map(x=>({id:x.id,name:x.name,description:x.description,price:x.price,image:x.image_url})));
  }

  async function submitReservation(e){
    e.preventDefault();
    const fd=new FormData(e.currentTarget);
    const payload={full_name:fd.get('full_name'),phone:fd.get('phone'),reservation_date:fd.get('date'),reservation_time:fd.get('time'),guests:Number(fd.get('guests')),notes:fd.get('notes'),dish_id:selected?.id||null};
    if(supabase){
      const {error}=await supabase.rpc('create_public_reservation',{p_full_name:payload.full_name,p_phone:payload.phone,p_reservation_date:payload.reservation_date,p_reservation_time:payload.reservation_time,p_guests:payload.guests,p_notes:payload.notes||null,p_dish_id:payload.dish_id});
      if(error){setStatus(error.message);return;}
    }
    setReservation(payload); setSelected(null); setStatus('success');
  }

  async function findReservations(e){
    e.preventDefault();
    if(!supabase){setStatus('demo');return;}
    const {data,error}=await supabase.rpc('get_public_reservations',{p_phone:phone});
    if(error){setStatus(error.message);return;}
    setReservation({history:data||[]}); setLookup(false);
  }

  async function install(){
    if(installPrompt){await installPrompt.prompt();setInstallPrompt(null);}
  }

  return <div className="app">
    <header className="topbar">
      <a href="#accueil" className="brand"><img src="/logo.svg" alt="Les Délices de CANA"/><span>Les Délices de CANA</span></a>
      <nav><a href="#menu">Menu</a><a href="#reservation">Réserver</a><button onClick={()=>setLookup(true)}>Ma réservation</button></nav>
    </header>

    <main>
      <section id="accueil" className="hero">
        <div className="hero-copy">
          <span className="eyebrow">Gonaté · Cuisine & convivialité</span>
          <h1>Les saveurs qui donnent envie de revenir.</h1>
          <p>Découvrez notre menu du jour, préparé avec soin, puis réservez simplement votre table.</p>
          <div className="actions"><a className="btn primary" href="#menu">Voir le menu <ChevronRight size={18}/></a><a className="btn ghost" href="#reservation">Réserver une table</a></div>
          {installPrompt && <button className="install" onClick={install}>＋ Installer l'application</button>}
        </div>
        <div className="hero-card"><img src="/logo.svg" alt="" /><div><strong>Menu du jour</strong><span>Disponible dès 06h00</span></div></div>
      </section>

      <section id="menu" className="section">
        <div className="section-head"><div><span className="eyebrow">Aujourd'hui · {new Date().toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long'})}</span><h2>Le menu du jour</h2></div><span className="open"><span/> Ouvert</span></div>
        <div className="dish-grid">{menu.map(d=><article className="dish" key={d.id} onClick={()=>setSelected(d)}>
          <div className="dish-image">{d.image ? <img src={d.image} alt={d.name}/> : <UtensilsCrossed size={34}/>}<span>{money(d.price)}</span></div>
          <div className="dish-body"><h3>{d.name}</h3><p>{d.description}</p><button>Réserver <ChevronRight size={16}/></button></div>
        </article>)}</div>
      </section>

      <section className="drinks"><div><span className="eyebrow">Toujours disponibles</span><h2>Boissons fraîches</h2></div><div className="drink-list">{DRINKS.map(x=><span key={x}>{x}</span>)}</div></section>

      <section id="reservation" className="reservation-section">
        <div><span className="eyebrow">Votre table</span><h2>Réservez en quelques secondes.</h2><p>Choisissez votre heure de passage et nous préparons votre accueil.</p><div className="contact"><span><MapPin size={18}/> Gonaté, Côte d’Ivoire</span><span><Phone size={18}/> Contact du restaurant</span></div></div>
        <form className="reservation-form" onSubmit={submitReservation}>
          <label>Nom complet<input name="full_name" required placeholder="Votre nom et prénom"/></label>
          <label>Téléphone<input name="phone" required inputMode="tel" placeholder="07 00 00 00 00"/></label>
          <div className="two"><label>Date<input name="date" type="date" required defaultValue={todayISO()}/></label><label>Heure<input name="time" type="time" required/></label></div>
          <label>Nombre de personnes<select name="guests" defaultValue="2"><option value="1">1 personne</option><option value="2">2 personnes</option><option value="3">3 personnes</option><option value="4">4 personnes</option><option value="5">5 personnes</option><option value="6">6 personnes</option><option value="7">7 personnes</option><option value="8">8 personnes</option></select></label>
          <label>Précision (facultatif)<textarea name="notes" rows="2" placeholder="Une précision pour l'équipe..."/></label>
          <button className="btn primary full">Confirmer ma réservation</button>
          {status && status!=='success' && status!=='demo' && <small className="error">{status}</small>}
          {status==='success' && <div className="success"><CheckCircle2/> Réservation enregistrée. L'équipe va la traiter.</div>}
        </form>
      </section>
    </main>

    <footer><img src="/logo.svg" alt="Les Délices de CANA"/><span>© {new Date().getFullYear()} Les Délices de CANA · Gonaté</span><a href="/admin">Administration</a></footer>

    {selected && <div className="modal-backdrop" onClick={()=>setSelected(null)}><div className="modal" onClick={e=>e.stopPropagation()}><button className="close" onClick={()=>setSelected(null)}><X/></button><span className="eyebrow">Réservation</span><h2>{selected.name}</h2><p>{selected.description}</p><strong className="modal-price">{money(selected.price)}</strong><a className="btn primary full" href="#reservation" onClick={()=>setSelected(null)}>Continuer la réservation</a></div></div>}

    {lookup && <div className="modal-backdrop" onClick={()=>setLookup(false)}><div className="modal" onClick={e=>e.stopPropagation()}><button className="close" onClick={()=>setLookup(false)}><X/></button><span className="eyebrow">Espace client</span><h2>Suivre ma réservation</h2><p>Entrez le numéro utilisé lors de votre réservation.</p><form onSubmit={findReservations}><label>Téléphone<input value={phone} onChange={e=>setPhone(e.target.value)} required inputMode="tel"/></label><button className="btn primary full">Afficher mes réservations</button></form></div></div>}
  </div>
}

createRoot(document.getElementById('root')).render(<App/>);