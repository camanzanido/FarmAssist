-- Researcher overview can be scoped to chosen municipalities, matched by (city, province) like the city stats.
-- Dropped and recreated rather than overloaded: a second overload would make old APKs' two-argument calls ambiguous.
drop function if exists public.researcher_overview(timestamptz, text);

create function public.researcher_overview(p_since timestamptz, p_tz text default 'UTC', p_places jsonb default null)
returns json
language plpgsql
stable
security invoker
set search_path to 'public'
as $function$
declare
  v_this_month timestamp := date_trunc('month', now() at time zone p_tz);
  v_month_start timestamptz := v_this_month at time zone p_tz;
  v_filtered boolean := p_places is not null and jsonb_typeof(p_places) = 'array' and jsonb_array_length(p_places) > 0;
  v_result json;
begin
  if not public.is_researcher() then
    raise exception 'Researcher access required' using errcode = '42501';
  end if;

  with all_d as (
    select d.user_id, d.decision_type, d.location_id, d.profit_increase, d.datetime::timestamptz as at
    from public.decisions d
    where d.decision_type <> 'harvest'
      and (not v_filtered or exists (
        select 1
        from public.locations l
        join jsonb_to_recordset(p_places) as p(city text, province text)
          on p.city = l.city and p.province = l.province
        where l.id = d.location_id
      ))
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
        and (not v_filtered or u.id in (select user_id from all_d where user_id is not null))
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

revoke all on function public.researcher_overview(timestamptz, text, jsonb) from public, anon;
grant execute on function public.researcher_overview(timestamptz, text, jsonb) to authenticated;
