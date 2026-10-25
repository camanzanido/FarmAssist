-- Researcher stats report the average gain alongside the median, and the retired harvest decision type is removed.

-- 1. Remove harvest decisions; PowerSync then deletes them from phones. Options go first in case the foreign key does not cascade.
delete from public.decision_options
where decision_id in (select id from public.decisions where decision_type = 'harvest');
delete from public.decisions where decision_type = 'harvest';
delete from public.predefined_options where decision_type = 'harvest';

-- 2. Old APKs may still upload a harvest row, so researcher reads skip the type rather than rejecting the upload.
-- Dropped and recreated like the original: d.* may have grown, which create or replace cannot reorder.
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
left join public.locations l on l.id = d.location_id
where d.decision_type <> 'harvest';

revoke all on public.researcher_decisions from anon;

-- 3. Overview gains average_gain; median_gain stays for APKs that still read it.
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
    where d.decision_type <> 'harvest'
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
    'average_gain', coalesce((
      select avg(profit_increase) from all_d where profit_increase is not null
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

-- 4. City stats gain an average_gain column; a new return type needs a drop, and old APKs ignore the extra column.
drop function if exists public.researcher_city_stats();
create function public.researcher_city_stats()
returns table (city text, province text, decisions bigint, farmers bigint, median_gain double precision, average_gain double precision)
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
    coalesce(percentile_cont(0.5) within group (order by d.profit_increase), 0)::double precision,
    coalesce(avg(d.profit_increase), 0)::double precision
  from public.decisions d
  join public.locations l on l.id = d.location_id
  where d.decision_type <> 'harvest'
    and coalesce(trim(l.city), '') <> '' and coalesce(trim(l.province), '') <> ''
  group by l.city, l.province
  order by count(*) desc;
end;
$function$;

revoke all on function public.researcher_overview(timestamptz, text) from public, anon;
revoke all on function public.researcher_city_stats() from public, anon;
grant execute on function public.researcher_overview(timestamptz, text) to authenticated;
grant execute on function public.researcher_city_stats() to authenticated;
