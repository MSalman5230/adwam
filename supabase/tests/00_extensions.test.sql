begin;
select plan(2);

select has_extension('pg_cron');
select has_extension('pg_net');

select * from finish();
rollback;
