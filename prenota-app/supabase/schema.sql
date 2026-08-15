-- Schema database per Prenota App
-- Da eseguire nel SQL Editor di Supabase (Dashboard > SQL Editor)

create extension if not exists "uuid-ossp";

-- Staff del ristorante (collegato all'auth di Supabase)
create table staff (
  id uuid primary key default uuid_generate_v4(),
  auth_user_id uuid references auth.users(id) on delete cascade,
  full_name text not null,
  role text not null default 'staff', -- 'staff' | 'admin'
  created_at timestamptz not null default now()
);

-- Tavoli del ristorante (anagrafica, non mappa fisica)
create table tables (
  id uuid primary key default uuid_generate_v4(),
  number text not null,
  capacity int not null check (capacity > 0),
  status text not null default 'free', -- 'free' | 'occupied' | 'reserved' | 'closed'
  notes text,
  created_at timestamptz not null default now()
);

-- Clienti
create table customers (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  phone text,
  notes text, -- es. allergie, preferenze
  is_regular boolean not null default false,
  reservation_count int not null default 0,
  created_at timestamptz not null default now()
);

-- Prenotazioni
create table reservations (
  id uuid primary key default uuid_generate_v4(),
  customer_id uuid references customers(id) on delete set null,
  customer_name text not null, -- denormalizzato per prenotazioni senza cliente registrato
  phone text,
  party_size int not null check (party_size > 0),
  reservation_time timestamptz not null,
  status text not null default 'pending', -- 'confirmed' | 'pending' | 'late' | 'cancelled'
  table_id uuid references tables(id) on delete set null,
  notes text,
  source text not null default 'manual', -- 'manual' | 'photo'
  created_by uuid references staff(id) on delete set null,
  created_at timestamptz not null default now()
);

create index idx_reservations_time on reservations(reservation_time);
create index idx_reservations_status on reservations(status);

-- Row Level Security: solo lo staff autenticato può leggere/scrivere
alter table staff enable row level security;
alter table tables enable row level security;
alter table customers enable row level security;
alter table reservations enable row level security;

create policy "Staff autenticato può leggere/scrivere tables"
  on tables for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

create policy "Staff autenticato può leggere/scrivere customers"
  on customers for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

create policy "Staff autenticato può leggere/scrivere reservations"
  on reservations for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

create policy "Staff autenticato può leggere il proprio profilo staff"
  on staff for select
  using (auth.role() = 'authenticated');
