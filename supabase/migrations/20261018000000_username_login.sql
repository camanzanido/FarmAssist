-- Usernames become a login name, so they must be unique regardless of case (fix any duplicates before running).

create unique index if not exists users_username_lower_key
  on public.users (lower(username))
  where coalesce(username, '') <> '';

-- Lets the Register screen check a username before the account is created.
create or replace function public.username_available(p_username text)
returns boolean
language sql
stable security definer
set search_path to 'public'
as $function$
  select not exists (
    select 1 from public.users u
    where lower(u.username) = lower(trim(p_username))
  );
$function$;

revoke all on function public.username_available(text) from public;
grant execute on function public.username_available(text) to anon, authenticated;

-- Only the sign-in Edge Function may turn a username into an email, so emails never reach the app.
create or replace function public.login_email_for_username(p_username text)
returns text
language sql
stable security definer
set search_path to 'public'
as $function$
  select u.email from public.users u
  where lower(u.username) = lower(trim(p_username))
  limit 1;
$function$;

revoke all on function public.login_email_for_username(text) from public, anon, authenticated;
grant execute on function public.login_email_for_username(text) to service_role;
