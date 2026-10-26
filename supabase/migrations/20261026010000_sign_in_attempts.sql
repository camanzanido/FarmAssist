-- Rate limit for the username sign-in Edge Function, which Supabase Auth only sees as one IP.

create table if not exists public.sign_in_attempts (
  id           bigserial primary key,
  key          text not null,
  attempted_at timestamptz not null default now()
);

create index if not exists sign_in_attempts_key_time on public.sign_in_attempts (key, attempted_at);

-- RLS on with no policies: only the service role (the Edge Function) can touch it.
alter table public.sign_in_attempts enable row level security;

-- Records an attempt and returns false once the key has p_max attempts inside the window.
create or replace function public.check_sign_in_rate(p_key text, p_max integer, p_window_seconds integer)
returns boolean
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_count integer;
begin
  delete from public.sign_in_attempts where attempted_at < now() - interval '1 day';

  select count(*) into v_count
  from public.sign_in_attempts
  where key = p_key and attempted_at > now() - make_interval(secs => p_window_seconds);

  if v_count >= p_max then
    return false;
  end if;

  insert into public.sign_in_attempts (key) values (p_key);
  return true;
end;
$function$;

create or replace function public.clear_sign_in_rate(p_key text)
returns void
language sql
security definer
set search_path to 'public'
as $function$
  delete from public.sign_in_attempts where key = p_key;
$function$;

revoke all on function public.check_sign_in_rate(text, integer, integer) from public, anon, authenticated;
revoke all on function public.clear_sign_in_rate(text) from public, anon, authenticated;
grant execute on function public.check_sign_in_rate(text, integer, integer) to service_role;
grant execute on function public.clear_sign_in_rate(text) to service_role;
