create or replace function public.forget_me_v1()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  install_id uuid := adwam_private.require_anonymous_install();
begin
  delete from public.installs where id = install_id;
  delete from auth.users where id = install_id and is_anonymous;
end;
$$;
