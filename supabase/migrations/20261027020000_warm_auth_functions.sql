-- Keeps sign-in and register loaded during farm hours; a plain GET gets a quick 405 with no database work, which is enough to wake the worker.

create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.unschedule(jobid) from cron.job where jobname = 'warm-auth-functions';

-- Every 3 minutes, 6:00 to 16:59 Philippine time (22:00 to 08:59 UTC).
select cron.schedule('warm-auth-functions', '*/3 0-8,22-23 * * *', $$
  select net.http_get('https://hxlhglbtehcztcmfoqyt.supabase.co/functions/v1/sign-in');
  select net.http_get('https://hxlhglbtehcztcmfoqyt.supabase.co/functions/v1/register');
$$);
