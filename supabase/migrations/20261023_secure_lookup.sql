create table if not exists public.student_course_rooms (
  student_id text not null check (student_id ~ '^\d{8,9}$'),
  course_code text not null,
  room text not null,
  primary key (student_id, course_code)
);
create index if not exists student_course_rooms_student_id_idx on public.student_course_rooms (student_id);
alter table public.student_course_rooms enable row level security;
revoke all on public.student_course_rooms from anon, authenticated;

create table if not exists public.lookup_rate_limits (
  ip_hash text primary key,
  window_started_at timestamptz not null default now(),
  attempts integer not null default 0 check (attempts >= 0)
);
alter table public.lookup_rate_limits enable row level security;
revoke all on public.lookup_rate_limits from anon, authenticated;

create or replace function public.consume_lookup_limit(p_ip_hash text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare entry public.lookup_rate_limits%rowtype;
begin
  insert into public.lookup_rate_limits (ip_hash, attempts) values (p_ip_hash, 0)
  on conflict (ip_hash) do nothing;
  select * into entry from public.lookup_rate_limits where ip_hash = p_ip_hash for update;
  if entry.window_started_at < now() - interval '10 minutes' then
    update public.lookup_rate_limits set window_started_at = now(), attempts = 1 where ip_hash = p_ip_hash;
    return true;
  end if;
  if entry.attempts >= 15 then return false; end if;
  update public.lookup_rate_limits set attempts = attempts + 1 where ip_hash = p_ip_hash;
  return true;
end;
$$;
revoke all on function public.consume_lookup_limit(text) from public, anon, authenticated;
grant execute on function public.consume_lookup_limit(text) to service_role;
