-- Monthly decision counts for the Overview line chart: any window of 1-24 months, with the same location filter as researcher_overview.
-- Additive: a new function, so older APKs that only call researcher_overview are unaffected.
create or replace function public.researcher_monthly_counts(p_from date, p_months int, p_tz text default 'UTC', p_places jsonb default null)
returns json
language plpgsql
stable
security invoker
set search_path to 'public'
as $function$
declare
  v_months int := least(greatest(coalesce(p_months, 6), 1), 24);
  v_start timestamp := date_trunc('month', p_from::timestamp);
  v_filtered boolean := p_places is not null and jsonb_typeof(p_places) = 'array' and jsonb_array_length(p_places) > 0;
  v_result json;
begin
  if not public.is_researcher() then
    raise exception 'Researcher access required' using errcode = '42501';
  end if;

  with scoped as (
    select date_trunc('month', d.datetime::timestamptz at time zone p_tz) as m
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
  months as (
    select generate_series(v_start, v_start + make_interval(months => v_months - 1), interval '1 month') as m
  )
  select json_build_object(
    'first_month', (select to_char(min(m), 'YYYY-MM') from scoped),
    'months', (
      select json_agg(json_build_object(
        'month', to_char(mo.m, 'YYYY-MM'),
        'count', (select count(*) from scoped s where s.m = mo.m)
      ) order by mo.m)
      from months mo
    )
  ) into v_result;

  return v_result;
end;
$function$;

revoke all on function public.researcher_monthly_counts(date, int, text, jsonb) from public, anon;
grant execute on function public.researcher_monthly_counts(date, int, text, jsonb) to authenticated;
