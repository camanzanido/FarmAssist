-- Auth is the source of truth for a user's email: re-install the copy trigger, repair drifted rows, and read Auth for username sign-in.

-- 1. Same trigger as 20261001000000_sync_user_email.sql, re-created in case that migration never ran.
create or replace function public.sync_user_email()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  update public.users set email = new.email where id = new.id;
  return new;
end;
$function$;

revoke all on function public.sync_user_email() from public, anon, authenticated;

drop trigger if exists on_auth_email_changed on auth.users;
create trigger on_auth_email_changed
  after update of email on auth.users
  for each row
  when (old.email is distinct from new.email)
  execute function public.sync_user_email();

-- 2. Copy the Auth email onto any profile that drifted while the trigger was missing; PowerSync then updates phones.
update public.users u
set email = a.email
from auth.users a
where a.id = u.id
  and u.email is distinct from a.email;

-- 3. Username sign-in reads the email Auth will check the password against, so a stale profile copy can't break it.
create or replace function public.login_email_for_username(p_username text)
returns text
language sql
stable security definer
set search_path to 'public'
as $function$
  select a.email
  from public.users u
  join auth.users a on a.id = u.id
  where lower(u.username) = lower(trim(p_username))
  limit 1;
$function$;

revoke all on function public.login_email_for_username(text) from public, anon, authenticated;
grant execute on function public.login_email_for_username(text) to service_role;
