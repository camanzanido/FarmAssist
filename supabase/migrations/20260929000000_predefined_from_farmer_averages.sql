-- Predefined inputs now come from farmers: a view averages decision_options per municipality, researchers review an average and publish it to predefined_options, and farmers load published rows.

-- 1. Undo the options-based predefined inputs from 20260928000000; options is being retired.
drop policy if exists options_select_predefined on public.options;
drop policy if exists options_insert_predefined on public.options;
drop policy if exists options_update_predefined on public.options;
drop policy if exists options_delete_predefined on public.options;
drop index if exists public.options_predefined_type_idx;
alter table public.options drop column if exists is_predefined;
alter table public.options drop column if exists province;

-- 2. Farmer averages per option and municipality; security_invoker keeps RLS, so only researchers see every farmer's rows.
-- Dropped first because the earlier version of this view has different columns, which create or replace cannot rename.
drop view if exists public.option_averages_by_location;
create view public.option_averages_by_location
with (security_invoker = on) as
select
  d.decision_type,
  lower(trim(o.option_name)) as option_key,
  min(trim(o.option_name)) as option_name,
  l.province,
  l.city as municipality,
  count(*)::int as total_entries,
  count(distinct d.user_id)::int as farmer_count,
  max(d.datetime) as latest_entry,
  round(avg(o.price)::numeric, 2)::float8 as price,
  round(avg(o.cost_driest)::numeric, 2)::float8 as cost_driest,
  round(avg(o.cost_very_dry)::numeric, 2)::float8 as cost_very_dry,
  round(avg(o.cost_below_avg)::numeric, 2)::float8 as cost_below_avg,
  round(avg(o.cost_average)::numeric, 2)::float8 as cost_average,
  round(avg(o.cost_above_avg)::numeric, 2)::float8 as cost_above_avg,
  round(avg(o.cost_very_good)::numeric, 2)::float8 as cost_very_good,
  round(avg(o.cost_wettest)::numeric, 2)::float8 as cost_wettest,
  round(avg(o.add_cost_driest)::numeric, 2)::float8 as add_cost_driest,
  round(avg(o.add_cost_very_dry)::numeric, 2)::float8 as add_cost_very_dry,
  round(avg(o.add_cost_below_avg)::numeric, 2)::float8 as add_cost_below_avg,
  round(avg(o.add_cost_average)::numeric, 2)::float8 as add_cost_average,
  round(avg(o.add_cost_above_avg)::numeric, 2)::float8 as add_cost_above_avg,
  round(avg(o.add_cost_very_good)::numeric, 2)::float8 as add_cost_very_good,
  round(avg(o.add_cost_wettest)::numeric, 2)::float8 as add_cost_wettest,
  round(avg(o.yield_driest)::numeric, 2)::float8 as yield_driest,
  round(avg(o.yield_very_dry)::numeric, 2)::float8 as yield_very_dry,
  round(avg(o.yield_below_avg)::numeric, 2)::float8 as yield_below_avg,
  round(avg(o.yield_average)::numeric, 2)::float8 as yield_average,
  round(avg(o.yield_above_avg)::numeric, 2)::float8 as yield_above_avg,
  round(avg(o.yield_very_good)::numeric, 2)::float8 as yield_very_good,
  round(avg(o.yield_wettest)::numeric, 2)::float8 as yield_wettest
from public.decision_options o
join public.decisions d on d.id = o.decision_id
join public.locations l on l.id = d.location_id
group by d.decision_type, lower(trim(o.option_name)), l.province, l.city;

revoke all on public.option_averages_by_location from anon;

-- 3. Researcher-reviewed values farmers can load. Null municipality = whole province, null province = everywhere.
create table if not exists public.predefined_options (
  id uuid primary key default gen_random_uuid(),
  decision_type text not null,
  option_name text not null check (length(trim(option_name)) > 0),
  province text,
  municipality text,
  price double precision not null check (price > 0),
  cost_driest double precision not null,
  cost_very_dry double precision not null,
  cost_below_avg double precision not null,
  cost_average double precision not null,
  cost_above_avg double precision not null,
  cost_very_good double precision not null,
  cost_wettest double precision not null,
  add_cost_driest double precision not null,
  add_cost_very_dry double precision not null,
  add_cost_below_avg double precision not null,
  add_cost_average double precision not null,
  add_cost_above_avg double precision not null,
  add_cost_very_good double precision not null,
  add_cost_wettest double precision not null,
  yield_driest double precision not null,
  yield_very_dry double precision not null,
  yield_below_avg double precision not null,
  yield_average double precision not null,
  yield_above_avg double precision not null,
  yield_very_good double precision not null,
  yield_wettest double precision not null,
  source_entries int,
  source_farmers int,
  published_by uuid references public.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint predefined_options_municipality_needs_province check (municipality is null or province is not null)
);

-- One published row per option and place, whatever the spelling or spacing.
create unique index if not exists predefined_options_unique_place_idx on public.predefined_options (
  decision_type,
  lower(trim(option_name)),
  coalesce(lower(trim(province)), ''),
  coalesce(lower(trim(municipality)), '')
);

alter table public.predefined_options enable row level security;

drop policy if exists predefined_options_select on public.predefined_options;
create policy predefined_options_select on public.predefined_options
  for select to authenticated
  using (true);

drop policy if exists predefined_options_insert on public.predefined_options;
create policy predefined_options_insert on public.predefined_options
  for insert to authenticated
  with check (public.is_researcher() and published_by = auth.uid());

drop policy if exists predefined_options_update on public.predefined_options;
create policy predefined_options_update on public.predefined_options
  for update to authenticated
  using (public.is_researcher())
  with check (public.is_researcher() and published_by = auth.uid());

drop policy if exists predefined_options_delete on public.predefined_options;
create policy predefined_options_delete on public.predefined_options
  for delete to authenticated
  using (public.is_researcher());
