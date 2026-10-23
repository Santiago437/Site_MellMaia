-- Enable the pg_cron extension in Supabase first, then run once in SQL Editor.
create extension if not exists pg_cron;
select cron.schedule('mell-maia-expire-reservations','* * * * *','select public.expire_reservations()');
-- Review failures: select * from cron.job_run_details order by start_time desc limit 20;
