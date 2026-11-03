-- Fase 3: daftar "Berikutnya" di layar Antrean berjalan (desain 3b).
-- Hanya nomor antrean yang menunggu pada tanggal milik token, tanpa nama.
-- Token tidak dikenal menghasilkan nol baris, bukan error.
create function public.get_next_waiting(p_token text, p_limit int default 3)
returns table (out_number int)
language sql
stable
security definer
set search_path = ''
as $$
  select w.number
  from public.queue_entries q
  join public.queue_entries w
    on w.queue_date = q.queue_date and w.status = 'waiting'
  where p_token ~ '^[0-9a-f]{64}$'
    and q.public_token = p_token
  order by w.number
  limit least(greatest(coalesce(p_limit, 3), 1), 10)
$$;

revoke all on function public.get_next_waiting(text, int) from public, anon, authenticated, service_role;
grant execute on function public.get_next_waiting(text, int) to service_role;
