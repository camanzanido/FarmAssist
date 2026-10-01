create index if not exists decisions_user_datetime_idx on public.decisions (user_id, datetime desc);

drop view if exists public.researcher_users;
create view public.researcher_users
with (security_invoker = on) as
select
  u.*,
  (u.status = 'pending') as is_pending,
  (select max(d.datetime::timestamptz) from public.decisions d where d.user_id = u.id) as last_decision_at
from public.users u;

revoke all on public.researcher_users from anon;
