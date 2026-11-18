-- AI Workforce waitlist: signups, referral codes and live stats.
-- The table is locked down (RLS on, no policies). Visitors can only go through
-- the three functions below, which never return anyone else's email.

create table if not exists public.waitlist (
  id          bigint generated always as identity primary key,
  email       text not null unique
              check (length(email) <= 254 and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]{2,}$'),
  code        text not null unique default substr(md5(gen_random_uuid()::text), 1, 8),
  referred_by text references public.waitlist (code) on delete set null,
  segment     text check (segment in ('Manufacturing', 'Services', 'Retail', 'Other')),
  created_at  timestamptz not null default now()
);

create index if not exists waitlist_referred_by_idx on public.waitlist (referred_by);

alter table public.waitlist enable row level security;
revoke all on table public.waitlist from anon, authenticated;

-- Position: earlier signups rank higher; every successful referral moves you up 25 places.
create or replace function public.waitlist_stats(p_code text default null)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id    bigint;
  v_refs  int;
  v_pos   int;
  v_total int;
begin
  select count(*) into v_total from waitlist;
  if p_code is null then
    return json_build_object('total', v_total);
  end if;

  select id into v_id from waitlist where code = p_code;
  if v_id is null then
    return json_build_object('total', v_total);
  end if;

  select count(*) into v_refs from waitlist where referred_by = p_code;

  select 1 + count(*) into v_pos
  from waitlist w
  where (w.id - 25 * (select count(*) from waitlist r where r.referred_by = w.code)) < (v_id - 25 * v_refs);

  return json_build_object('total', v_total, 'code', p_code, 'referrals', v_refs, 'position', v_pos);
end;
$$;

create or replace function public.join_waitlist(p_email text, p_ref text default null)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(trim(p_email));
  v_code  text;
begin
  if v_email is null or length(v_email) > 254 or v_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]{2,}$' then
    raise exception 'invalid_email';
  end if;

  select code into v_code from waitlist where email = v_email;
  if v_code is null then
    insert into waitlist (email, referred_by)
    values (v_email, (select code from waitlist where code = p_ref))
    returning code into v_code;
  end if;

  return waitlist_stats(v_code);
end;
$$;

create or replace function public.set_waitlist_segment(p_code text, p_segment text)
returns void
language sql
security definer
set search_path = public
as $$
  update waitlist
  set segment = p_segment
  where code = p_code
    and p_segment in ('Manufacturing', 'Services', 'Retail', 'Other');
$$;

revoke all on function public.waitlist_stats(text) from public;
revoke all on function public.join_waitlist(text, text) from public;
revoke all on function public.set_waitlist_segment(text, text) from public;
grant execute on function public.waitlist_stats(text) to anon, authenticated;
grant execute on function public.join_waitlist(text, text) to anon, authenticated;
grant execute on function public.set_waitlist_segment(text, text) to anon, authenticated;
