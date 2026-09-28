-- Predefined inputs: researcher-managed option values that signed-in farmers can load into the decision wizard.

alter table public.options add column if not exists is_predefined boolean not null default false;
alter table public.options add column if not exists province text;

-- Predefined options apply to a province (or all of them), not to one farmer's location.
alter table public.options alter column location_id drop not null;

create index if not exists options_predefined_type_idx
  on public.options (decision_type)
  where is_predefined;

alter table public.options enable row level security;

-- Any signed-in user may read predefined options.
drop policy if exists options_select_predefined on public.options;
create policy options_select_predefined on public.options
  for select to authenticated
  using (is_predefined);

-- Active researchers manage predefined options; they cannot touch farmers' own rows through these policies.
drop policy if exists options_insert_predefined on public.options;
create policy options_insert_predefined on public.options
  for insert to authenticated
  with check (is_predefined and public.is_researcher() and user_id = auth.uid());

drop policy if exists options_update_predefined on public.options;
create policy options_update_predefined on public.options
  for update to authenticated
  using (is_predefined and public.is_researcher())
  with check (is_predefined and public.is_researcher());

drop policy if exists options_delete_predefined on public.options;
create policy options_delete_predefined on public.options
  for delete to authenticated
  using (is_predefined and public.is_researcher());
