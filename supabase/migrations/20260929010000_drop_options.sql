-- Retire public.options: decisions snapshot their options into decision_options, and predefined inputs live in predefined_options.
drop table if exists public.options;
