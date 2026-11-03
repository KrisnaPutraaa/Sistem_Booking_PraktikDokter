-- Fase 2, langkah 4: audit log untuk auditor (siapa mengubah apa).
-- Hanya owner yang boleh membaca. Diisi trigger, tidak bisa ditulis langsung
-- oleh peran mana pun, termasuk service_role (append-only).
-- Untuk queue_entries hanya kolom non-pribadi yang dicatat: nama, WhatsApp,
-- keluhan, dan token tidak disalin ke audit log.

create table public.audit_log (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  actor uuid,                -- staf; null = pasien online atau sistem
  action text not null,      -- mis. queue_entries.update
  entry_id uuid,             -- id queue_entries bila relevan
  old_data jsonb,
  new_data jsonb
);

create index audit_log_entry_idx on public.audit_log (entry_id);
create index audit_log_at_idx on public.audit_log (at);

alter table public.audit_log enable row level security;

revoke all on table public.audit_log from public, anon, authenticated, service_role;

create policy audit_log_select on public.audit_log
  for select to authenticated
  using ((select public.current_app_role()) = 'owner');

grant select on public.audit_log to authenticated, service_role;

-- actor: auth.uid() untuk staf yang login; untuk aksi lewat service_role
-- (walk-in), take_queue mengisi app.actor dengan id staf dalam transaksi yang sama.
create function public.write_audit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := coalesce(auth.uid(), nullif(current_setting('app.actor', true), '')::uuid);
  v_hidden text[] := '{}';
  v_old jsonb;
  v_new jsonb;
  v_entry uuid;
begin
  if tg_table_name = 'queue_entries' then
    v_hidden := array['name', 'whatsapp', 'complaint', 'public_token'];
  end if;

  if tg_op in ('UPDATE', 'DELETE') then
    v_old := to_jsonb(old) - v_hidden;
  end if;
  if tg_op in ('INSERT', 'UPDATE') then
    v_new := to_jsonb(new) - v_hidden;
  end if;

  if tg_table_name = 'queue_entries' then
    v_entry := coalesce(v_new, v_old) ->> 'id';
  end if;

  insert into public.audit_log (actor, action, entry_id, old_data, new_data)
  values (v_actor, tg_table_name || '.' || lower(tg_op), v_entry, v_old, v_new);

  return null;
end
$$;

revoke all on function public.write_audit() from public, anon, authenticated, service_role;

create trigger queue_entries_audit
after insert or update on public.queue_entries
for each row execute function public.write_audit();

create trigger practice_settings_audit
after update on public.practice_settings
for each row execute function public.write_audit();

create trigger closed_days_audit
after insert or update or delete on public.closed_days
for each row execute function public.write_audit();
