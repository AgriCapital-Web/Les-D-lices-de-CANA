create extension if not exists pgcrypto;

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.dishes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  price integer not null check (price >= 0),
  image_url text,
  category text default 'plat',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.menus (
  id uuid primary key default gen_random_uuid(),
  service_date date not null unique,
  publish_at timestamptz not null,
  status text not null default 'scheduled' check (status in ('draft','scheduled','published','archived')),
  title text,
  created_at timestamptz not null default now()
);

create table if not exists public.menu_items (
  id uuid primary key default gen_random_uuid(),
  menu_id uuid not null references public.menus(id) on delete cascade,
  dish_id uuid references public.dishes(id) on delete set null,
  name text not null,
  description text,
  price integer not null check (price >= 0),
  image_url text,
  position integer not null default 0
);

create table if not exists public.reservations (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id),
  reservation_date date not null,
  reservation_time time not null,
  guests integer not null default 1 check (guests > 0 and guests <= 50),
  dish_id uuid references public.dishes(id) on delete set null,
  notes text,
  status text not null default 'pending' check (status in ('pending','confirmed','arrived','completed','cancelled','no_show')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists reservations_phone_idx on public.customers(phone);
create index if not exists reservations_date_idx on public.reservations(reservation_date,reservation_time);
create index if not exists menus_publish_idx on public.menus(service_date,publish_at,status);

alter table public.customers enable row level security;
alter table public.dishes enable row level security;
alter table public.menus enable row level security;
alter table public.menu_items enable row level security;
alter table public.reservations enable row level security;

create policy "public read active dishes" on public.dishes for select using (active = true);
create policy "public read published menus" on public.menus for select using (status='published' and publish_at <= now());
create policy "public read published menu items" on public.menu_items for select using (exists (select 1 from public.menus m where m.id=menu_id and m.status='published' and m.publish_at <= now()));

create or replace function public.create_public_reservation(
  p_full_name text,
  p_phone text,
  p_reservation_date date,
  p_reservation_time time,
  p_guests integer,
  p_notes text default null,
  p_dish_id uuid default null
) returns uuid
language plpgsql security definer set search_path=public
as $$
declare c_id uuid; r_id uuid;
begin
  if length(trim(coalesce(p_full_name,''))) < 2 then raise exception 'Nom invalide'; end if;
  if length(regexp_replace(coalesce(p_phone,''),'\\D','','g')) < 8 then raise exception 'Numéro de téléphone invalide'; end if;
  insert into customers(full_name,phone) values(trim(p_full_name),trim(p_phone))
  on conflict(phone) do update set full_name=excluded.full_name,updated_at=now()
  returning id into c_id;
  insert into reservations(customer_id,reservation_date,reservation_time,guests,notes,dish_id)
  values(c_id,p_reservation_date,p_reservation_time,p_guests,nullif(trim(p_notes),''),p_dish_id)
  returning id into r_id;
  return r_id;
end $$;

create or replace function public.get_public_reservations(p_phone text)
returns table(id uuid,reservation_date date,reservation_time time,guests integer,status text,dish_name text)
language sql security definer set search_path=public
as $$
  select r.id,r.reservation_date,r.reservation_time,r.guests,r.status,d.name
  from reservations r join customers c on c.id=r.customer_id
  left join dishes d on d.id=r.dish_id
  where c.phone=trim(p_phone)
  order by r.reservation_date desc,r.reservation_time desc
  limit 50;
$$;

grant execute on function public.create_public_reservation(text,text,date,time,integer,text,uuid) to anon,authenticated;
grant execute on function public.get_public_reservations(text) to anon,authenticated;