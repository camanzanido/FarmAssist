
create index if not exists decisions_datetime_id_idx on public.decisions (datetime desc, id);
create index if not exists decisions_type_idx on public.decisions (decision_type);
create index if not exists users_created_at_id_idx on public.users (created_at desc, id);

drop view if exists public.researcher_decisions;
create view public.researcher_decisions
with (security_invoker = on) as
select
  d.*,
  u.name as farmer_name,
  u.username as farmer_username,
  l.city,
  l.province
from public.decisions d
left join public.users u on u.id = d.user_id
left join public.locations l on l.id = d.location_id;

revoke all on public.researcher_decisions from anon;

drop view if exists public.researcher_users;
create view public.researcher_users
with (security_invoker = on) as
select u.*, (u.status = 'pending') as is_pending
from public.users u;

revoke all on public.researcher_users from anon;

create or replace function public.researcher_overview(p_since timestamptz, p_tz text default 'UTC')
returns json
language plpgsql
stable
security invoker
set search_path to 'public'
as $function$
declare
  v_this_month timestamp := date_trunc('month', now() at time zone p_tz);
  v_month_start timestamptz := v_this_month at time zone p_tz;
  v_result json;
begin
  if not public.is_researcher() then
    raise exception 'Researcher access required' using errcode = '42501';
  end if;

  with all_d as (
    select d.user_id, d.decision_type, d.location_id, d.profit_increase, d.datetime::timestamptz as at
    from public.decisions d
  ),
  ranged as (
    select * from all_d where p_since is null or at >= p_since
  ),
  months as (
    select generate_series(v_this_month - interval '5 months', v_this_month, interval '1 month') as m
  )
  select json_build_object(
    'total', (select count(*) from all_d),
    'this_month', (select count(*) from all_d where at >= v_month_start),
    'active_farmers', (select count(distinct user_id) from all_d where user_id is not null),
    'new_farmers_this_month', (
      select count(*) from public.users u
      where u.user_type = 'farmer' and u.created_at::timestamptz >= v_month_start
    ),
    'researchers', (select count(*) from public.users u where u.user_type = 'researcher'),
    'median_gain', coalesce((
      select percentile_cont(0.5) within group (order by profit_increase)
      from all_d where profit_increase is not null
    ), 0),
    'range_total', (select count(*) from ranged),
    'per_month', (
      select json_agg(json_build_object(
        'month', to_char(mo.m, 'YYYY-MM'),
        'count', (select count(*) from ranged r where date_trunc('month', r.at at time zone p_tz) = mo.m)
      ) order by mo.m)
      from months mo
    ),
    'by_type', coalesce((
      select json_agg(json_build_object('decision_type', t.decision_type, 'count', t.c))
      from (select decision_type, count(*) as c from ranged group by decision_type) t
    ), '[]'::json),
    'top_cities', coalesce((
      select json_agg(json_build_object('city', t.city, 'count', t.c) order by t.c desc, t.city)
      from (
        select l.city, count(*) as c
        from ranged r
        join public.locations l on l.id = r.location_id
        where coalesce(trim(l.city), '') <> ''
        group by l.city
        order by count(*) desc, l.city
        limit 4
      ) t
    ), '[]'::json)
  ) into v_result;

  return v_result;
end;
$function$;

create or replace function public.researcher_city_stats()
returns table (city text, province text, decisions bigint, farmers bigint, median_gain double precision)
language plpgsql
stable
security invoker
set search_path to 'public'
as $function$
#variable_conflict use_column
begin
  if not public.is_researcher() then
    raise exception 'Researcher access required' using errcode = '42501';
  end if;

  return query
  select
    l.city::text,
    l.province::text,
    count(*)::bigint,
    count(distinct d.user_id)::bigint,
    coalesce(percentile_cont(0.5) within group (order by d.profit_increase), 0)::double precision
  from public.decisions d
  join public.locations l on l.id = d.location_id
  where coalesce(trim(l.city), '') <> '' and coalesce(trim(l.province), '') <> ''
  group by l.city, l.province
  order by count(*) desc;
end;
$function$;

revoke all on function public.researcher_overview(timestamptz, text) from public, anon;
revoke all on function public.researcher_city_stats() from public, anon;
grant execute on function public.researcher_overview(timestamptz, text) to authenticated;
grant execute on function public.researcher_city_stats() to authenticated;
