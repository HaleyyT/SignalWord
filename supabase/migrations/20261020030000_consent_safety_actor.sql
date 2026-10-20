-- Distinguish recipient/service operations from authenticated user sessions.
-- The actor header is generated inside the database, never copied from clients.
create or replace function public.require_safety_authority(p_subject uuid default null) returns void
language plpgsql security definer set search_path='' as $$
declare endpoint text; secret text; result extensions.http_response;
begin
 -- Explicit, privileged local fixtures only. PostgREST's authenticator and cron
 -- sessions cannot obtain this exemption through a client JWT or RPC parameter.
 if session_user='postgres' and current_setting('signalword.local_fixture',true)='true' then return; end if;
 select decrypted_secret into endpoint from vault.decrypted_secrets where name='signalword_control_url';
 select decrypted_secret into secret from vault.decrypted_secrets where name='signalword_control_reader';
 if endpoint is null or secret is null or length(secret)<32 or
   (endpoint !~ '^https://[^/?#]+$' and not(session_user='postgres' and endpoint ~ '^http://(host.docker.internal|[0-9.]+):[0-9]+$')) then
  raise exception 'SAFETY_AUTHORITY_UNAVAILABLE' using errcode='P0001';
 end if;
 perform extensions.http_set_curlopt('CURLOPT_TIMEOUT_MS','2000');
 select * into result from extensions.http(('GET',endpoint||'/gate',
  array[extensions.http_header('Authorization','Bearer '||secret),extensions.http_header('X-SignalWord-Subject',coalesce(p_subject::text,'')),extensions.http_header('X-SignalWord-Issued-At',coalesce(auth.jwt()->>'iat','')),extensions.http_header('X-SignalWord-Actor',case when auth.role()='authenticated' then 'session' when auth.role()='service_role' then 'service' else 'recipient' end)],null,null)::extensions.http_request);
 if result.status<>200 or (result.content::jsonb->>'allowed') is distinct from 'true' then
  raise exception 'SAFETY_AUTHORITY_UNAVAILABLE' using errcode='P0001';
 end if;
exception when others then raise exception 'SAFETY_AUTHORITY_UNAVAILABLE' using errcode='P0001';
end $$;
