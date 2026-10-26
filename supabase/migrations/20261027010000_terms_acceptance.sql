-- Records which Terms & Privacy version each account accepted; null means not yet (old APKs never set it).
alter table public.users add column if not exists terms_accepted_at timestamptz;
alter table public.users add column if not exists terms_version text;
