-- An inactive account can't sign in or refresh a session, so a disabled farmer or deleted researcher stops syncing.
-- Status is still the source of truth; this mirrors it into Supabase Auth, so old APKs that update status directly are covered too.

create or replace function public.apply_user_status_ban()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if new.status = 'inactive' then
    update auth.users set banned_until = 'infinity' where id = new.id;
    -- Refresh tokens cascade with their session, so every signed-in device loses access once its access token expires.
    delete from auth.sessions where user_id = new.id;
  elsif old.status = 'inactive' then
    update auth.users set banned_until = null where id = new.id;
  end if;
  return new;
end;
$function$;

revoke all on function public.apply_user_status_ban() from public, anon, authenticated;

drop trigger if exists apply_user_status_ban on public.users;
create trigger apply_user_status_ban
  after update of status on public.users
  for each row
  when (new.status is distinct from old.status)
  execute function public.apply_user_status_ban();

update auth.users a set banned_until = 'infinity'
from public.users u
where u.id = a.id and u.status = 'inactive';

delete from auth.sessions s
using public.users u
where u.id = s.user_id and u.status = 'inactive';
