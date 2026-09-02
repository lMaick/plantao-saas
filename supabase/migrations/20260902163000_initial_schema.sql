create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  timezone text not null default 'America/Sao_Paulo',
  default_currency_code char(3) not null default 'BRL',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.locations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (btrim(name) <> ''),
  kind text,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, id)
);

create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (btrim(name) <> ''),
  phone text,
  notes text,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, id)
);

create table public.shifts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  location_id uuid not null,
  referrer_contact_id uuid,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  state text not null default 'scheduled'
    check (state in ('scheduled', 'realized', 'cancelled')),
  amount_cents bigint check (amount_cents is null or amount_cents > 0),
  currency_code char(3) not null default 'BRL',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, id),
  check (ends_at > starts_at),
  check (state <> 'realized' or amount_cents is not null),
  foreign key (user_id, location_id)
    references public.locations (user_id, id),
  foreign key (user_id, referrer_contact_id)
    references public.contacts (user_id, id)
);

create table public.obligations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  shift_id uuid not null,
  amount_due_cents bigint not null check (amount_due_cents > 0),
  currency_code char(3) not null default 'BRL',
  due_date date not null,
  payer_type text not null check (payer_type in ('location', 'contact')),
  payer_location_id uuid,
  payer_contact_id uuid,
  voided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, id),
  unique (user_id, shift_id),
  check (
    (payer_type = 'location'
      and payer_location_id is not null
      and payer_contact_id is null)
    or
    (payer_type = 'contact'
      and payer_contact_id is not null
      and payer_location_id is null)
  ),
  foreign key (user_id, shift_id)
    references public.shifts (user_id, id),
  foreign key (user_id, payer_location_id)
    references public.locations (user_id, id),
  foreign key (user_id, payer_contact_id)
    references public.contacts (user_id, id)
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  obligation_id uuid not null,
  amount_cents bigint not null check (amount_cents > 0),
  currency_code char(3) not null default 'BRL',
  payment_date date not null,
  notes text,
  voided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, id),
  foreign key (user_id, obligation_id)
    references public.obligations (user_id, id)
);

create index locations_user_archived_name_idx
  on public.locations (user_id, archived_at, name);

create index contacts_user_archived_name_idx
  on public.contacts (user_id, archived_at, name);

create index shifts_user_state_starts_idx
  on public.shifts (user_id, state, starts_at);

create index obligations_user_due_idx
  on public.obligations (user_id, due_date);

create index obligations_user_voided_due_idx
  on public.obligations (user_id, voided_at, due_date);

create index payments_user_date_idx
  on public.payments (user_id, payment_date);

create index payments_user_obligation_voided_idx
  on public.payments (user_id, obligation_id, voided_at);

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger locations_set_updated_at
before update on public.locations
for each row execute function public.set_updated_at();

create trigger contacts_set_updated_at
before update on public.contacts
for each row execute function public.set_updated_at();

create trigger shifts_set_updated_at
before update on public.shifts
for each row execute function public.set_updated_at();

create trigger obligations_set_updated_at
before update on public.obligations
for each row execute function public.set_updated_at();

create trigger payments_set_updated_at
before update on public.payments
for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.locations enable row level security;
alter table public.contacts enable row level security;
alter table public.shifts enable row level security;
alter table public.obligations enable row level security;
alter table public.payments enable row level security;

create policy "profiles_select_own"
  on public.profiles for select
  using (id = (select auth.uid()));

create policy "profiles_insert_own"
  on public.profiles for insert
  with check (id = (select auth.uid()));

create policy "profiles_update_own"
  on public.profiles for update
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create policy "locations_select_own"
  on public.locations for select
  using (user_id = (select auth.uid()));

create policy "locations_insert_own"
  on public.locations for insert
  with check (user_id = (select auth.uid()));

create policy "locations_update_own"
  on public.locations for update
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "contacts_select_own"
  on public.contacts for select
  using (user_id = (select auth.uid()));

create policy "contacts_insert_own"
  on public.contacts for insert
  with check (user_id = (select auth.uid()));

create policy "contacts_update_own"
  on public.contacts for update
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "shifts_select_own"
  on public.shifts for select
  using (user_id = (select auth.uid()));

create policy "shifts_insert_own"
  on public.shifts for insert
  with check (user_id = (select auth.uid()));

create policy "shifts_update_own"
  on public.shifts for update
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "obligations_select_own"
  on public.obligations for select
  using (user_id = (select auth.uid()));

create policy "obligations_update_own"
  on public.obligations for update
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "payments_select_own"
  on public.payments for select
  using (user_id = (select auth.uid()));

create policy "payments_update_own"
  on public.payments for update
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
