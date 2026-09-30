import React,{useEffect,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {supabase} from './supabase';
import {ChevronRight,CheckCircle2,X,MapPin,Phone,UtensilsCrossed,CalendarDays,Clock3,Search,Upload,Save,Plus,Trash2,LogOut,RefreshCw} from 'lucide-react';
import './styles.css';

const FALLBACK_IMAGE='/menu-default.svg';
const DISH_IMAGES={
 'Poulet braisé':'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=900&q=82',
 'Poisson braisé':'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&w=900&q=82',
 'Poulet kedjenou':'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&w=900&q=82',
 'Sauce graine':'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=900&q=82',
 'Sauce aubergine':'https://images.unsplash.com/photo-1601050690117-94f5f6fa8bd7?auto=format&fit=crop&w=900&q=82',
 'Soupe de cabri':'https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=900&q=82',
 'Jus de gingembre':'https://images.unsplash.com/photo-1544145945-f90425340c7e?auto=format&fit=crop&w=900&q=82',
 'Jus de bissap':'https://images.unsplash.com/photo-1551024506-0bccd828d307?auto=format&fit=crop&w=900&q=82'
};
const DEMO=[
 {id:'demo-1',name:'Poulet braisé',description:'Poulet braisé, accompagné de l’accompagnement du jour.',price:3500,category:'Plats'},
 {id:'demo-2',name:'Poisson braisé',description:'Poisson braisé, sauce pimentée et accompagnement maison.',price:4000,category:'Plats'},
 {id:'demo-3',name:'Poulet kedjenou',description:'Kedjenou de poulet mijoté façon CANA.',price:4000,category:'Spécialités'},
 {id:'demo-4',name:'Sauce graine',description:'Sauce graine maison avec viande ou poisson selon disponibilité.',price:3500,category:'Plats'},
 {id:'demo-5',name:'Sauce aubergine',description:'Aubergine mijotée et accompagnement du jour.',price:3000,category:'Plats'},
 {id:'demo-6',name:'Soupe de cabri',description:'Soupe généreuse préparée maison, servie bien chaude.',price:4000,category:'Spécialités'},
 {id:'demo-7',name:'Jus de gingembre',description:'Jus naturel maison, frais et parfumé.',price:1000,category:'Boissons'},
 {id:'demo-8',name:'Jus de bissap',description:'Bissap maison servi bien frais.',price:1000,category:'Boissons'}
];
const CATS=['Tous','Plats','Spécialités','Boissons'];
const money=v=>new Intl.NumberFormat('fr-FR').format(Number(v)||0)+' FCFA';
const todayISO=()=>new Date().toLocaleDateString('en-CA',{timeZone:'Africa/Abidjan'});
const imageFor=item=>item?.image_url||DISH_IMAGES[item?.name]||FALLBACK_IMAGE;

function SafeImage({src,alt,className='',fallback=FALLBACK_IMAGE}){const [failed,setFailed]=useState(false);return <img className={className} src={failed?fallback:src||fallback} alt={alt||''} onError={()=>setFailed(true)} loading="lazy"/>;}

function ClientApp(){
 const [items,setItems]=useState(DEMO),[category,setCategory]=useState('Tous'),[selected,setSelected]=useState(null),[reservationOpen,setReservationOpen]=useState(false),[lookup,setLookup]=useState(false),[phone,setPhone]=useState(''),[history,setHistory]=useState(null),[status,setStatus]=useState('');
 useEffect(()=>{loadMenu()},[]);
 async function loadMenu(){
  if(!supabase)return;
  const {data}=await supabase.from('menu_items').select('id,dish_id,name,description,price,image_url,category,position,menus!inner(service_date,publish_at,status)').eq('menus.service_date',todayISO()).in('menus.status',['scheduled','published']).lte('menus.publish_at',new Date().toISOString()).order('position');
  if(data?.length)setItems(data.map(x=>({...x,category:x.category||'Plats'})));
 }
 function openReservation(dish=null){setStatus('');setSelected(dish);setReservationOpen(true)}
 async function reserve(e){
  e.preventDefault();setStatus('');
  const fd=new FormData(e.currentTarget);
  const p={full_name:fd.get('full_name'),phone:fd.get('phone'),reservation_date:fd.get('date'),reservation_time:fd.get('time'),dish_count:Number(fd.get('dish_count')),notes:fd.get('notes'),dish_id:fd.get('dish_id')||null};
  if(!supabase){setStatus('Le service de réservation est momentanément indisponible.');return;}
  const {error}=await supabase.rpc('create_public_reservation',{p_full_name:p.full_name,p_phone:p.phone,p_reservation_date:p.reservation_date,p_reservation_time:p.reservation_time,p_dish_count:p.dish_count,p_notes:p.notes||null,p_dish_id:p.dish_id||null});
  if(error){setStatus(error.message);return;}
  setStatus('success');e.currentTarget.reset();
 }
 async function find(e){
  e.preventDefault();setStatus('');
  if(!supabase){setHistory([]);return;}
  const {data,error}=await supabase.rpc('get_public_reservations',{p_phone:phone});
  if(error){setStatus(error.message);return;}setHistory(data||[]);
 }
 async function cancel(id){
  if(!supabase)return;
  const {error}=await supabase.rpc('cancel_public_reservation',{p_reservation_id:id,p_phone:phone});
  if(error){setStatus(error.message);return;}
  const {data}=await supabase.rpc('get_public_reservations',{p_phone:phone});setHistory(data||[]);
 }
 const visible=category==='Tous'?items:items.filter(x=>(x.category||'Plats')===category);
 return <div className="site">
  <header className="site-header">
   <a className="brand" href="#accueil" aria-label="Les Délices de CANA"><SafeImage src="/brand/cana-logo.png" alt="Les Délices de CANA" fallback="/brand/cana-logo.png"/></a>
   <nav><a href="#menu">La carte</a><button onClick={()=>openReservation()}>Réserver</button><button onClick={()=>{setHistory(null);setStatus('');setLookup(true)}}>Ma réservation</button></nav>
  </header>
  <main>
   <section id="accueil" className="hero">
    <div className="hero-content"><span className="kicker">Les Délices de CANA · Gonaté</span><h1>La cuisine qui rassemble.</h1><p>Découvrez la carte du jour et les saveurs de CANA, préparées avec soin.</p><div className="hero-actions"><a className="btn gold" href="#menu">Voir la carte <ChevronRight size={17}/></a><button className="btn light" onClick={()=>openReservation()}>Réserver</button></div></div>
    <div className="hero-art"><div className="hero-glow"></div><SafeImage src="/brand/cana-logo.png" alt="Logo Les Délices de CANA"/></div>
   </section>
   <section id="menu" className="catalog">
    <div className="catalog-head"><div><span className="kicker">La carte du jour</span><h2>Nos plats</h2><p>Une sélection simple, claire et prête à commander.</p></div><span className="open"><i/> Ouvert</span></div>
    <div className="category-bar">{CATS.map(c=><button className={category===c?'active':''} key={c} onClick={()=>setCategory(c)}>{c}</button>)}</div>
    <div className="catalog-grid">{visible.map(item=><article className="product" key={item.id} onClick={()=>setSelected(item)}>
      <div className="product-image"><SafeImage src={imageFor(item)} alt={item.name}/><span>{money(item.price)}</span></div>
      <div className="product-info"><small>{item.category||'Plats'}</small><h3>{item.name}</h3><p>{item.description}</p><button onClick={e=>{e.stopPropagation();setSelected(item)}}>Voir le plat <ChevronRight size={15}/></button></div>
    </article>)}</div>
   </section>
   <section className="quick-actions"><div><span className="kicker">Les Délices de CANA</span><h2>Une envie ?</h2><p>Consultez la carte, réservez ou retrouvez une réservation.</p></div><div className="quick-actions-buttons"><button className="btn dark" onClick={()=>openReservation()}><CalendarDays size={17}/> Réserver</button><button className="btn light" onClick={()=>{setHistory(null);setStatus('');setLookup(true)}}><Search size={17}/> Ma réservation</button></div></section>
  </main>
  <footer><SafeImage src="/brand/cana-logo.png" alt="Les Délices de CANA"/><span>© {new Date().getFullYear()} Les Délices de CANA · Gonaté</span><a href="#accueil">Retour en haut</a></footer>

  {selected&&!reservationOpen&&<div className="overlay" onClick={()=>setSelected(null)}><div className="product-modal" onClick={e=>e.stopPropagation()}><button className="close" onClick={()=>setSelected(null)}><X/></button><div className="modal-image"><SafeImage src={imageFor(selected)} alt={selected.name}/></div><span className="kicker">{selected.category||'Plats'}</span><h2>{selected.name}</h2><p>{selected.description}</p><strong>{money(selected.price)}</strong><button className="btn dark full" onClick={()=>openReservation(selected)}>Réserver ce plat</button></div></div>}

  {reservationOpen&&<div className="overlay" onClick={()=>{setReservationOpen(false);setStatus('')}}><div className="booking-modal" onClick={e=>e.stopPropagation()}><button className="close" onClick={()=>{setReservationOpen(false);setStatus('')}}><X/></button><span className="kicker">Réservation</span><h2>Réserver</h2>{status==='success'?<div className="reservation-success"><CheckCircle2 size={42}/><h3>Demande enregistrée</h3><p>Votre demande de réservation a bien été transmise au restaurant.</p><button className="btn dark full" onClick={()=>{setReservationOpen(false);setStatus('')}}>Fermer</button></div>:<form className="booking-form" onSubmit={reserve}><label>Nom complet<input name="full_name" required placeholder="Votre nom et prénom"/></label><label>Téléphone<input name="phone" required inputMode="tel" placeholder="07 00 00 00 00"/></label><div className="form-two"><label>Date<input name="date" type="date" required defaultValue={todayISO()}/></label><label>Heure<input name="time" type="time" required/></label></div><label>Plat souhaité<select name="dish_id" defaultValue={selected?.dish_id||selected?.id||''}><option value="">Choisir un plat</option>{items.map(item=><option key={item.id} value={item.dish_id||item.id}>{item.name} — {money(item.price)}</option>)}</select></label><label>Nombre de plats<select name="dish_count" defaultValue="1">{[1,2,3,4,5,6,7,8,9,10].map(n=><option key={n} value={n}>{n}</option>)}</select></label><label>Précision (facultatif)<textarea name="notes" rows="3" placeholder="Une précision pour l’équipe..."/></label><button className="btn dark full">Confirmer ma réservation</button>{status&&status!=='success'&&<small className="error">{status}</small>}</form>}</div></div>}

  {lookup&&<div className="overlay" onClick={()=>setLookup(false)}><div className="lookup" onClick={e=>e.stopPropagation()}><button className="close" onClick={()=>setLookup(false)}><X/></button><span className="kicker">Espace client</span><h2>Ma réservation</h2>{!history?<form onSubmit={find}><p>Entrez le numéro utilisé lors de la réservation.</p><label>Téléphone<input value={phone} onChange={e=>setPhone(e.target.value)} required inputMode="tel"/></label><button className="btn dark full">Rechercher</button>{status&&<small className="error">{status}</small>}</form>:<div className="history">{history.length?history.map(r=><div className="history-item" key={r.id}><div><b>{r.dish_name||'Réservation'}</b><span>{r.reservation_date} · {String(r.reservation_time).slice(0,5)} · {r.dish_count} plat{r.dish_count>1?'s':''}</span><em className={'badge '+r.status}>{r.status}</em></div>{['pending','confirmed'].includes(r.status)&&<button className="cancel" onClick={()=>cancel(r.id)}>Annuler</button>}</div>):<p>Aucune réservation trouvée pour ce numéro.</p>}</div>}</div></div>}
 </div>
}

function AdminApp(){
 const [session,setSession]=useState(null),[tab,setTab]=useState('reservations'),[reservations,setReservations]=useState([]),[menus,setMenus]=useState([]),[dishes,setDishes]=useState([]),[message,setMessage]=useState(''),[menuForm,setMenuForm]=useState({date:todayISO(),time:'06:00',title:'Menu du jour'}),[dish,setDish]=useState({name:'',description:'',price:'',category:'Plats',image_url:''}),[editing,setEditing]=useState(null),[login,setLogin]=useState({email:'',password:''});
 useEffect(()=>{if(!supabase)return;supabase.auth.getSession().then(({data})=>{setSession(data.session);if(data.session)refresh()});const {data:{subscription}}=supabase.auth.onAuthStateChange((_e,s)=>{setSession(s);if(s)refresh()});return()=>subscription.unsubscribe()},[]);
 async function signIn(e){e.preventDefault();const {data,error}=await supabase.auth.signInWithPassword({email:login.email,password:login.password});if(error)setMessage(error.message);else setSession(data.session);}
 async function refresh(){const [r,m,d]=await Promise.all([supabase.from('reservations').select('id,reservation_date,reservation_time,dish_count,status,notes,customers(full_name,phone),dishes(name)').order('reservation_date',{ascending:false}).order('reservation_time',{ascending:false}).limit(100),supabase.from('menus').select('*,menu_items(id,name,price,image_url,category)').order('service_date',{ascending:false}),supabase.from('dishes').select('*').order('category').order('name')]);setReservations(r.data||[]);setMenus(m.data||[]);setDishes(d.data||[]);}
 async function saveDish(e){e.preventDefault();let data={...dish,price:Number(dish.price),image_url:dish.image_url||null};let q=editing?supabase.from('dishes').update(data).eq('id',editing):supabase.from('dishes').insert(data);const {error}=await q;if(error)setMessage(error.message);else{setMessage('Plat enregistré.');setDish({name:'',description:'',price:'',category:'Plats',image_url:''});setEditing(null);refresh();}}
 async function uploadImage(file){if(!file||!supabase)return;const ext=file.name.split('.').pop().toLowerCase();const path='dishes/'+crypto.randomUUID()+'.'+ext;const {error}=await supabase.storage.from('menu-images').upload(path,file,{upsert:false,contentType:file.type});if(error){setMessage(error.message);return;}const {data}=supabase.storage.from('menu-images').getPublicUrl(path);setDish(x=>({...x,image_url:data.publicUrl}));setMessage('Image chargée. Enregistrez le plat pour conserver la modification.');}
 async function deleteDish(id){if(!confirm('Supprimer ce plat ?'))return;const {error}=await supabase.from('dishes').delete().eq('id',id);if(error)setMessage(error.message);else refresh();}
 async function createMenu(e){e.preventDefault();const publishAt=new Date(menuForm.date+'T'+menuForm.time+':00+00:00').toISOString();const {error}=await supabase.from('menus').upsert({service_date:menuForm.date,publish_at:publishAt,status:'scheduled',title:menuForm.title||'Menu du jour'},{onConflict:'service_date'});if(error)setMessage(error.message);else{setMessage('Menu programmé.');refresh();}}
 async function addDish(menuId,d){const {error}=await supabase.from('menu_items').insert({menu_id:menuId,dish_id:d.id,name:d.name,description:d.description,price:d.price,image_url:d.image_url||DISH_IMAGES[d.name]||null,category:d.category||'Plats',position:0});if(error)setMessage(error.message);else refresh();}
 async function removeItem(id){const {error}=await supabase.from('menu_items').delete().eq('id',id);if(error)setMessage(error.message);else refresh();}
 if(!session)return <div className="admin-login"><SafeImage src="/brand/cana-logo.png" alt="Les Délices de CANA"/><span className="kicker">Espace privé</span><h1>Connexion</h1><form onSubmit={signIn}><label>Email<input type="email" value={login.email} onChange={e=>setLogin({...login,email:e.target.value})} required/></label><label>Mot de passe<input type="password" value={login.password} onChange={e=>setLogin({...login,password:e.target.value})} required/></label><button className="btn dark full">Se connecter</button>{message&&<small className="error">{message}</small>}</form></div>;
 return <div className="admin"><aside><SafeImage src="/brand/cana-logo.png" alt="Les Délices de CANA"/><button className={tab==='reservations'?'active':''} onClick={()=>setTab('reservations')}>Réservations</button><button className={tab==='menus'?'active':''} onClick={()=>setTab('menus')}>Menus</button><button className={tab==='dishes'?'active':''} onClick={()=>setTab('dishes')}>Plats & images</button><button onClick={()=>refresh()}><RefreshCw size={16}/> Actualiser</button><button className="logout" onClick={()=>supabase.auth.signOut()}><LogOut size={16}/> Déconnexion</button></aside><section className="admin-main"><div className="admin-top"><div><span className="kicker">Les Délices de CANA</span><h1>Administration</h1></div><span className="admin-status">Connecté</span></div>{message&&<div className="notice">{message}</div>}{tab==='reservations'&&<div className="admin-card"><div className="card-head"><h2>Réservations</h2><span>{reservations.length} demande(s)</span></div><div className="table-scroll"><table><thead><tr><th>Client</th><th>Date</th><th>Heure</th><th>Plats</th><th>Plat</th><th>Statut</th></tr></thead><tbody>{reservations.map(r=><tr key={r.id}><td><b>{r.customers?.full_name}</b><small>{r.customers?.phone}</small></td><td>{r.reservation_date}</td><td>{String(r.reservation_time).slice(0,5)}</td><td>{r.dish_count}</td><td>{r.dishes?.name||'—'}</td><td><span className={'badge '+r.status}>{r.status}</span></td></tr>)}</tbody></table></div></div>}{tab==='menus'&&<div className="admin-stack"><div className="admin-card"><h2>Programmer le menu</h2><form className="inline-form" onSubmit={createMenu}><label>Date<input type="date" value={menuForm.date} onChange={e=>setMenuForm({...menuForm,date:e.target.value})}/></label><label>Heure de publication<input type="time" value={menuForm.time} onChange={e=>setMenuForm({...menuForm,time:e.target.value})}/></label><label>Titre<input value={menuForm.title} onChange={e=>setMenuForm({...menuForm,title:e.target.value})}/></label><button className="btn dark"><CalendarDays size={16}/> Programmer</button></form></div>{menus.map(m=><div className="admin-card" key={m.id}><div className="card-head"><div><h2>{m.title||'Menu du jour'}</h2><span>{m.service_date} · {new Date(m.publish_at).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}</span></div><span className={'badge '+m.status}>{m.status}</span></div><div className="menu-items">{(m.menu_items||[]).map(mi=><div className="menu-row" key={mi.id}><span>{mi.name} · {money(mi.price)}</span><button onClick={()=>removeItem(mi.id)}><Trash2 size={15}/></button></div>)}</div><select className="add-select" onChange={e=>{const d=dishes.find(x=>x.id===e.target.value);if(d){addDish(m.id,d);e.target.value=''}}}><option value="">＋ Ajouter un plat à ce menu</option>{dishes.map(d=><option key={d.id} value={d.id}>{d.name} — {money(d.price)}</option>)}</select></div>)}</div>}{tab==='dishes'&&<div className="admin-stack"><div className="admin-card"><div className="card-head"><h2>{editing?'Modifier le plat':'Ajouter un plat'}</h2>{editing&&<button className="text-btn" onClick={()=>{setEditing(null);setDish({name:'',description:'',price:'',category:'Plats',image_url:''})}}>Annuler</button>}</div><form onSubmit={saveDish}><label>Nom<input required value={dish.name} onChange={e=>setDish({...dish,name:e.target.value})}/></label><label>Description<textarea value={dish.description} onChange={e=>setDish({...dish,description:e.target.value})}/></label><div className="form-two"><label>Prix<input required type="number" min="0" value={dish.price} onChange={e=>setDish({...dish,price:e.target.value})}/></label><label>Catégorie<select value={dish.category} onChange={e=>setDish({...dish,category:e.target.value})}><option>Plats</option><option>Spécialités</option><option>Boissons</option></select></label></div><label>Image<input type="file" accept="image/*" onChange={e=>uploadImage(e.target.files?.[0])}/></label>{dish.image_url&&<SafeImage className="preview" src={dish.image_url} alt="Aperçu"/>}<button className="btn dark"><Save size={16}/> Enregistrer le plat</button></form></div><div className="admin-card"><div className="card-head"><h2>Catalogue</h2><span>{dishes.length} plat(s)</span></div><div className="dish-list">{dishes.map(d=><div className="dish-admin-row" key={d.id}><div className="thumb">{d.image_url?<SafeImage src={d.image_url} alt=""/>:<UtensilsCrossed size={20}/>}</div><div className="dish-admin-copy"><b>{d.name}</b><span>{d.category} · {money(d.price)}</span></div><button onClick={()=>{setEditing(d.id);setDish({name:d.name,description:d.description||'',price:d.price,category:d.category||'Plats',image_url:d.image_url||''})}}><Save size={16}/></button><button onClick={()=>deleteDish(d.id)}><Trash2 size={16}/></button></div>)}</div></div></div>}</section></div>
}

createRoot(document.getElementById('root')).render(location.pathname==='/me'?<AdminApp/>:<ClientApp/>);
