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
