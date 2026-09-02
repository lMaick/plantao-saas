create or replace function public.realize_shift(
  p_shift_id uuid,
  p_amount_due_cents bigint,
  p_payer_type text,
  p_payer_id uuid,
  p_due_date date
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_shift public.shifts%rowtype;
  v_currency_code char(3);
  v_obligation_id uuid;
  v_payer_exists boolean;
begin
  if v_user_id is null then
    raise exception 'unauthenticated';
  end if;

  if p_amount_due_cents is null or p_amount_due_cents <= 0 then
    raise exception 'invalid_amount';
  end if;

  select *
    into v_shift
    from public.shifts
   where id = p_shift_id
     and user_id = v_user_id
   for update;

  if not found then
    raise exception 'shift_not_found';
  end if;

  if v_shift.state <> 'scheduled' then
    raise exception 'shift_not_scheduled';
  end if;

  if p_payer_type = 'location' then
    select exists (
      select 1
        from public.locations
       where id = p_payer_id
         and user_id = v_user_id
         and archived_at is null
    ) into v_payer_exists;
  elsif p_payer_type = 'contact' then
    select exists (
      select 1
        from public.contacts
       where id = p_payer_id
         and user_id = v_user_id
         and archived_at is null
    ) into v_payer_exists;
  else
    raise exception 'invalid_payer';
  end if;

  if not v_payer_exists then
    raise exception 'invalid_payer';
  end if;

  v_currency_code := v_shift.currency_code;

  update public.shifts
     set state = 'realized',
         amount_cents = p_amount_due_cents
   where id = v_shift.id
     and user_id = v_user_id;

  insert into public.obligations (
    user_id,
    shift_id,
    amount_due_cents,
    currency_code,
    due_date,
    payer_type,
    payer_location_id,
    payer_contact_id
  )
  values (
    v_user_id,
    v_shift.id,
    p_amount_due_cents,
    v_currency_code,
    p_due_date,
    p_payer_type,
    case when p_payer_type = 'location' then p_payer_id end,
    case when p_payer_type = 'contact' then p_payer_id end
  )
  returning id into v_obligation_id;

  return v_obligation_id;
end;
$$;

create or replace function public.prevent_direct_realized_shift()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' and new.state <> 'scheduled' then
    raise exception 'shift_must_start_scheduled';
  end if;
  return new;
end;
$$;

create trigger shifts_prevent_direct_realized_insert
before insert on public.shifts
for each row execute function public.prevent_direct_realized_shift();

create or replace function public.register_payment(
  p_obligation_id uuid,
  p_amount_cents bigint,
  p_payment_date date,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_amount_due_cents bigint;
  v_currency_code char(3);
  v_shift_id uuid;
  v_starts_at timestamptz;
  v_timezone text;
  v_received_cents bigint;
  v_payment_id uuid;
begin
  if v_user_id is null then
    raise exception 'unauthenticated';
  end if;

  if p_amount_cents is null or p_amount_cents <= 0 then
    raise exception 'invalid_amount';
  end if;

  select amount_due_cents, currency_code, shift_id
    into v_amount_due_cents, v_currency_code, v_shift_id
    from public.obligations
   where id = p_obligation_id
     and user_id = v_user_id
     and voided_at is null
   for update;

  if not found then
    raise exception 'obligation_not_found';
  end if;

  select starts_at
    into v_starts_at
    from public.shifts
   where id = v_shift_id
     and user_id = v_user_id;

  select timezone
    into v_timezone
    from public.profiles
   where id = v_user_id;

  if v_starts_at is null or v_timezone is null then
    raise exception 'profile_not_found';
  end if;

  select coalesce(sum(amount_cents), 0)::bigint
    into v_received_cents
    from public.payments
   where obligation_id = p_obligation_id
     and user_id = v_user_id
     and voided_at is null;

  if p_amount_cents > v_amount_due_cents - v_received_cents then
    raise exception 'payment_exceeds_balance';
  end if;

  if p_payment_date < (v_starts_at at time zone v_timezone)::date then
    raise exception 'payment_before_shift';
  end if;

  insert into public.payments (
    user_id,
    obligation_id,
    amount_cents,
    currency_code,
    payment_date,
    notes
  )
  values (
    v_user_id,
    p_obligation_id,
    p_amount_cents,
    v_currency_code,
    p_payment_date,
    p_notes
  )
  returning id into v_payment_id;

  return v_payment_id;
end;
$$;

create or replace function public.correct_obligation_amount(
  p_obligation_id uuid,
  p_new_amount_due_cents bigint
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_shift_id uuid;
  v_received_cents bigint;
begin
  if v_user_id is null then
    raise exception 'unauthenticated';
  end if;

  if p_new_amount_due_cents is null or p_new_amount_due_cents <= 0 then
    raise exception 'invalid_amount';
  end if;

  select shift_id
    into v_shift_id
    from public.obligations
   where id = p_obligation_id
     and user_id = v_user_id
     and voided_at is null
   for update;

  if not found then
    raise exception 'obligation_not_found';
  end if;

  perform 1
    from public.shifts
   where id = v_shift_id
     and user_id = v_user_id
   for update;

  select coalesce(sum(amount_cents), 0)::bigint
    into v_received_cents
    from public.payments
   where obligation_id = p_obligation_id
     and user_id = v_user_id
     and voided_at is null;

  if p_new_amount_due_cents < v_received_cents then
    raise exception 'obligation_amount_below_received';
  end if;

  update public.obligations
     set amount_due_cents = p_new_amount_due_cents
   where id = p_obligation_id
     and user_id = v_user_id;

  update public.shifts
     set amount_cents = p_new_amount_due_cents
   where id = v_shift_id
     and user_id = v_user_id;
end;
$$;

create or replace function public.void_payment(
  p_payment_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_obligation_id uuid;
  v_voided_at timestamptz;
begin
  if v_user_id is null then
    raise exception 'unauthenticated';
  end if;

  select obligation_id
    into v_obligation_id
    from public.payments
   where id = p_payment_id
     and user_id = v_user_id;

  if not found then
    raise exception 'payment_not_found';
  end if;

  perform 1
    from public.obligations
   where id = v_obligation_id
     and user_id = v_user_id
   for update;

  if not found then
    raise exception 'obligation_not_found';
  end if;

  select voided_at
    into v_voided_at
    from public.payments
   where id = p_payment_id
     and obligation_id = v_obligation_id
     and user_id = v_user_id
   for update;

  if not found then
    raise exception 'payment_not_found';
  end if;

  if v_voided_at is not null then
    raise exception 'payment_already_voided';
  end if;

  update public.payments
     set voided_at = now()
   where id = p_payment_id
     and user_id = v_user_id;
end;
$$;

create or replace function public.correct_payment(
  p_payment_id uuid,
  p_new_amount_cents bigint,
  p_new_payment_date date,
  p_new_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_obligation_id uuid;
  v_currency_code char(3);
  v_shift_id uuid;
  v_starts_at timestamptz;
  v_timezone text;
  v_received_without_old bigint;
  v_new_payment_id uuid;
begin
  if v_user_id is null then
    raise exception 'unauthenticated';
  end if;

  if p_new_amount_cents is null or p_new_amount_cents <= 0 then
    raise exception 'invalid_amount';
  end if;

  select obligation_id
    into v_obligation_id
    from public.payments
   where id = p_payment_id
     and user_id = v_user_id
     and voided_at is null;

  if not found then
    raise exception 'payment_not_found';
  end if;

  select o.currency_code, o.shift_id
    into v_currency_code, v_shift_id
    from public.obligations o
   where o.id = v_obligation_id
     and o.user_id = v_user_id
     and o.voided_at is null
   for update;

  if not found then
    raise exception 'obligation_not_found';
  end if;

  perform 1
    from public.payments
   where id = p_payment_id
     and obligation_id = v_obligation_id
     and user_id = v_user_id
     and voided_at is null
   for update;

  if not found then
    raise exception 'payment_not_found';
  end if;

  select s.starts_at
    into v_starts_at
    from public.shifts s
   where s.id = v_shift_id
     and s.user_id = v_user_id;

  select p.timezone
    into v_timezone
    from public.profiles p
   where p.id = v_user_id;

  if v_starts_at is null or v_timezone is null then
    raise exception 'profile_not_found';
  end if;

  select coalesce(sum(amount_cents), 0)::bigint
    into v_received_without_old
    from public.payments
   where obligation_id = v_obligation_id
     and user_id = v_user_id
     and voided_at is null
     and id <> p_payment_id;

  if p_new_amount_cents > (
    (select amount_due_cents
       from public.obligations
      where id = v_obligation_id
        and user_id = v_user_id)
    - v_received_without_old
  ) then
    raise exception 'payment_exceeds_balance';
  end if;

  if p_new_payment_date < (v_starts_at at time zone v_timezone)::date then
    raise exception 'payment_before_shift';
  end if;

  update public.payments
     set voided_at = now()
   where id = p_payment_id
     and user_id = v_user_id
     and voided_at is null;

  insert into public.payments (
    user_id,
    obligation_id,
    amount_cents,
    currency_code,
    payment_date,
    notes
  )
  values (
    v_user_id,
    v_obligation_id,
    p_new_amount_cents,
    v_currency_code,
    p_new_payment_date,
    p_new_notes
  )
  returning id into v_new_payment_id;

  return v_new_payment_id;
end;
$$;

revoke update on table public.shifts from authenticated;
revoke update on table public.obligations, public.payments from authenticated;

revoke execute on function public.realize_shift(uuid, bigint, text, uuid, date)
  from public, anon, authenticated;
revoke execute on function public.register_payment(uuid, bigint, date, text)
  from public, anon, authenticated;
revoke execute on function public.correct_obligation_amount(uuid, bigint)
  from public, anon, authenticated;
revoke execute on function public.void_payment(uuid)
  from public, anon, authenticated;
revoke execute on function public.correct_payment(uuid, bigint, date, text)
  from public, anon, authenticated;
revoke all on function public.prevent_direct_realized_shift()
  from public, anon, authenticated;

grant execute on function public.realize_shift(uuid, bigint, text, uuid, date)
  to authenticated;
grant execute on function public.register_payment(uuid, bigint, date, text)
  to authenticated;
grant execute on function public.correct_obligation_amount(uuid, bigint)
  to authenticated;
grant execute on function public.void_payment(uuid)
  to authenticated;
grant execute on function public.correct_payment(uuid, bigint, date, text)
  to authenticated;
