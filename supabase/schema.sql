create extension if not exists pgcrypto;

create table if not exists public.customers(
 id uuid primary key default gen_random_uuid(),
 full_name text not null,
 phone text not null unique,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create table if not exists public.dishes(
 id uuid primary key default gen_random_uuid(),
 name text not null,
 description text,
 price integer not null check(price>=0),
 image_url text,
 category text not null default 'Plats',
 active boolean not null default true,
 created_at timestamptz not null default now()
);
create table if not exists public.menus(
 id uuid primary key default gen_random_uuid(),
 service_date date not null unique,
 publish_at timestamptz not null,
 status text not null default 'scheduled' check(status in('draft','scheduled','published','archived')),
 title text,
 created_at timestamptz not null default now()
);
create table if not exists public.menu_items(
 id uuid primary key default gen_random_uuid(),
 menu_id uuid not null references public.menus(id) on delete cascade,
 dish_id uuid references public.dishes(id) on delete set null,
 name text not null,
 description text,
 price integer not null check(price>=0),
 image_url text,
 category text not null default 'Plats',
 position integer not null default 0
);
create table if not exists public.reservations(
 id uuid primary key default gen_random_uuid(),
 customer_id uuid not null references public.customers(id),
 reservation_date date not null,
 reservation_time time not null,
 dish_count integer not null default 1 check(dish_count between 1 and 50),
 dish_id uuid references public.dishes(id) on delete set null,
 notes text,
 status text not null default 'pending' check(status in('pending','confirmed','arrived','completed','cancelled','no_show')),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
do $ begin
 if exists(select 1 from information_schema.columns where table_schema='public' and table_name='reservations' and column_name='guests')
    and not exists(select 1 from information_schema.columns where table_schema='public' and table_name='reservations' and column_name='dish_count') then
   alter table public.reservations rename column guests to dish_count;
 end if;
end $;

create table if not exists public.staff(
 user_id uuid primary key references auth.users(id) on delete cascade,
 full_name text,
 role text not null default 'staff' check(role in('admin','manager','staff')),
 active boolean not null default true,
 created_at timestamptz not null default now()
);
create table if not exists public.push_subscriptions(
 id uuid primary key default gen_random_uuid(),
 user_id uuid references auth.users(id) on delete cascade,
 endpoint text not null unique,
 p256dh text,
 auth text,
 created_at timestamptz not null default now()
);

alter table public.menu_items add column if not exists category text not null default 'Plats';
alter table public.dishes add column if not exists category text not null default 'Plats';

create index if not exists reservations_date_idx on public.reservations(reservation_date,reservation_time);
create index if not exists menus_publish_idx on public.menus(service_date,publish_at,status);

alter table public.customers enable row level security;
alter table public.dishes enable row level security;
alter table public.menus enable row level security;
alter table public.menu_items enable row level security;
alter table public.reservations enable row level security;
alter table public.staff enable row level security;
alter table public.push_subscriptions enable row level security;

drop policy if exists "public read active dishes" on public.dishes;
drop policy if exists "public read published menus" on public.menus;
drop policy if exists "public read published menu items" on public.menu_items;
drop policy if exists "staff can read customers" on public.customers;
drop policy if exists "staff manage dishes" on public.dishes;
drop policy if exists "staff manage menus" on public.menus;
drop policy if exists "staff manage menu items" on public.menu_items;
drop policy if exists "staff read reservations" on public.reservations;
drop policy if exists "staff update reservations" on public.reservations;
drop policy if exists "staff can read own profile" on public.staff;
drop policy if exists "staff manage own push subscriptions" on public.push_subscriptions;

create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path=public
as $$ select exists(select 1 from public.staff where user_id=auth.uid() and active=true); $$;

create policy "public read active dishes" on public.dishes for select using(active=true);
create policy "public read published menus" on public.menus for select using(status in('scheduled','published') and publish_at<=now());
create policy "public read published menu items" on public.menu_items for select using(exists(select 1 from public.menus m where m.id=menu_id and m.status in('scheduled','published') and m.publish_at<=now()));
create policy "staff can read customers" on public.customers for select to authenticated using(public.is_staff());
create policy "staff manage dishes" on public.dishes for all to authenticated using(public.is_staff()) with check(public.is_staff());
create policy "staff manage menus" on public.menus for all to authenticated using(public.is_staff()) with check(public.is_staff());
create policy "staff manage menu items" on public.menu_items for all to authenticated using(public.is_staff()) with check(public.is_staff());
create policy "staff read reservations" on public.reservations for select to authenticated using(public.is_staff());
create policy "staff update reservations" on public.reservations for update to authenticated using(public.is_staff()) with check(public.is_staff());
create policy "staff can read own profile" on public.staff for select to authenticated using(user_id=auth.uid() and active=true);
create policy "staff manage own push subscriptions" on public.push_subscriptions for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());

create or replace function public.create_public_reservation(
 p_full_name text,p_phone text,p_reservation_date date,p_reservation_time time,
 p_dish_count integer,p_notes text default null,p_dish_id uuid default null
) returns uuid language plpgsql security definer set search_path=public as $$
declare c_id uuid;r_id uuid;
begin
 if length(trim(coalesce(p_full_name,'')))<2 then raise exception 'Nom invalide'; end if;
 if length(regexp_replace(coalesce(p_phone,''),'\\D','','g'))<8 then raise exception 'Numéro de téléphone invalide'; end if;
 if p_reservation_date<current_date then raise exception 'Date de réservation invalide'; end if;
 insert into customers(full_name,phone) values(trim(p_full_name),trim(p_phone))
 on conflict(phone) do update set full_name=excluded.full_name,updated_at=now()
 returning id into c_id;
 insert into reservations(customer_id,reservation_date,reservation_time,dish_count,notes,dish_id)
 values(c_id,p_reservation_date,p_reservation_time,p_dish_count,nullif(trim(p_notes),''),p_dish_id)
 returning id into r_id;
 return r_id;
end $$;
create or replace function public.get_public_reservations(p_phone text)
returns table(id uuid,reservation_date date,reservation_time time,dish_count integer,status text,dish_name text)
language sql security definer set search_path=public as $$
 select r.id,r.reservation_date,r.reservation_time,r.dish_count,r.status,d.name
 from reservations r join customers c on c.id=r.customer_id left join dishes d on d.id=r.dish_id
 where c.phone=trim(p_phone) order by r.reservation_date desc,r.reservation_time desc limit 50;
$$;
create or replace function public.cancel_public_reservation(p_reservation_id uuid,p_phone text)
returns boolean language plpgsql security definer set search_path=public as $$
declare changed integer;
begin
 update reservations r set status='cancelled',updated_at=now()
 from customers c where r.id=p_reservation_id and r.customer_id=c.id and c.phone=trim(p_phone)
 and r.status in('pending','confirmed');
 get diagnostics changed=row_count; return changed=1;
end $$;
grant execute on function public.create_public_reservation(text,text,date,time,integer,text,uuid) to anon,authenticated;
grant execute on function public.get_public_reservations(text) to anon,authenticated;
grant execute on function public.cancel_public_reservation(uuid,text) to anon,authenticated;

insert into storage.buckets(id,name,public) values('menu-images','menu-images',true)
on conflict(id) do update set public=true;
drop policy if exists "public can read menu images" on storage.objects;
drop policy if exists "staff can upload menu images" on storage.objects;
drop policy if exists "staff can update menu images" on storage.objects;
drop policy if exists "staff can delete menu images" on storage.objects;
create policy "public can read menu images" on storage.objects for select using(bucket_id='menu-images');
create policy "staff can upload menu images" on storage.objects for insert to authenticated with check(bucket_id='menu-images' and public.is_staff());
create policy "staff can update menu images" on storage.objects for update to authenticated using(bucket_id='menu-images' and public.is_staff()) with check(bucket_id='menu-images' and public.is_staff());
create policy "staff can delete menu images" on storage.objects for delete to authenticated using(bucket_id='menu-images' and public.is_staff());

-- Demo catalogue: idempotent by name.
insert into public.dishes(name,description,price,category,active)
select * from (values
('Poulet braisé','Poulet braisé à la braise, accompagné de l’accompagnement du jour.',3500,'Plats',true),
('Poisson braisé','Poisson braisé, sauce pimentée et accompagnement maison.',4000,'Plats',true),
('Poulet kedjenou','Kedjenou de poulet mijoté façon CANA.',4000,'Spécialités',true),
('Sauce graine','Sauce graine maison avec viande ou poisson selon disponibilité.',3500,'Plats',true),
('Sauce aubergine','Aubergine mijotée, épices douces et accompagnement du jour.',3000,'Plats',true),
('Soupe de cabri','Soupe généreuse préparée maison, servie bien chaude.',4000,'Spécialités',true),
('Jus de gingembre','Jus naturel maison, frais et parfumé.',1000,'Boissons',true),
('Jus de bissap','Bissap maison, servi bien frais.',1000,'Boissons',true)
) v(name,description,price,category,active)
where not exists(select 1 from public.dishes d where d.name=v.name);

insert into public.menus(service_date,publish_at,status,title)
values
(current_date,current_date+time '06:00','scheduled','Menu du jour'),
(current_date+1,current_date+1+time '06:00','scheduled','Menu du jour'),
(current_date+2,current_date+2+time '06:00','scheduled','Menu du jour')
on conflict(service_date) do update set title=excluded.title;

insert into public.menu_items(menu_id,dish_id,name,description,price,image_url,category,position)
select m.id,d.id,d.name,d.description,d.price,d.image_url,d.category,
row_number() over(partition by m.id order by d.name)::int
from public.menus m cross join public.dishes d
where m.service_date=current_date
and not exists(select 1 from public.menu_items mi where mi.menu_id=m.id and mi.dish_id=d.id);
