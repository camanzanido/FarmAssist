-- Researchers manage only farmer accounts and their own; they may deactivate themselves but never act on another researcher.
-- Pending researcher accounts (from old APKs) can still be approved or turned down.

create or replace function public.guard_user_privileged_columns()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_caller_is_researcher boolean;
  v_remaining_active     integer;
begin

  if auth.uid() is null then
    return new;
  end if;

  v_caller_is_researcher := public.is_researcher();

  if tg_op = 'INSERT' then
    if not v_caller_is_researcher then
      new.status := case
        when new.user_type = 'researcher' then 'pending'
        else 'active'
      end;
    end if;
    return new;
  end if;

  if new.user_type is distinct from old.user_type
     or new.status is distinct from old.status then

    if not v_caller_is_researcher then
      raise exception 'Only a researcher can change a role or account status'
        using errcode = '23514';
    end if;

    if old.id = auth.uid() then
      if new.user_type is distinct from old.user_type
         or not (old.status = 'active' and new.status = 'inactive') then
        raise exception 'You can only deactivate your own account'
          using errcode = '23514';
      end if;
    elsif old.user_type = 'researcher' and old.status <> 'pending' then
      raise exception 'You can only manage farmer accounts'
        using errcode = '23514';
    end if;

    if old.user_type = 'researcher' and old.status = 'active'
       and (new.user_type is distinct from 'researcher'
            or new.status is distinct from 'active') then

      select count(*) into v_remaining_active
      from public.users
      where user_type = 'researcher' and status = 'active' and id <> old.id;

      if v_remaining_active = 0 then
        raise exception 'At least one active researcher must remain'
          using errcode = '23514';
      end if;
    end if;
  end if;

  return new;
end;
$function$;
