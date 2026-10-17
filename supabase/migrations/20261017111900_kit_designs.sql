-- Kit designer: members save their own shirt designs (pattern, colours,
-- collar, sponsor text, name and number as a small JSON) and share them by
-- link. A shared design can be seen by anyone with the link; only the
-- designer changes or deletes it.

create table if not exists public.kit_designs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 60),
  design jsonb not null check (jsonb_typeof(design) = 'object' and pg_column_size(design) <= 4096),
  shared boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists kit_designs_user_idx on public.kit_designs (user_id, updated_at desc);
alter table public.kit_designs enable row level security;
create policy kit_designs_own_select on public.kit_designs for select to authenticated using (user_id = (select auth.uid()));
create policy kit_designs_own_insert on public.kit_designs for insert to authenticated with check (user_id = (select auth.uid()));
create policy kit_designs_own_update on public.kit_designs for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy kit_designs_own_delete on public.kit_designs for delete to authenticated using (user_id = (select auth.uid()));
revoke all on public.kit_designs from anon, authenticated;
grant select, insert, delete on public.kit_designs to authenticated;
grant update (name, design, shared) on public.kit_designs to authenticated;

-- At most 100 designs each, 60 saves an hour; updated_at kept by the server.
create or replace function private.kit_design_guard()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform private.hit('kit_design:' || new.user_id, 60, interval '1 hour');
  if tg_op = 'INSERT' and (select count(*) from public.kit_designs d where d.user_id = new.user_id) >= 100 then
    raise exception 'at most 100 designs' using errcode = 'P0001';
  end if;
  new.updated_at := now();
  if tg_op = 'INSERT' then new.created_at := now(); end if;
  return new;
end $$;
revoke execute on function private.kit_design_guard() from public;
drop trigger if exists kit_designs_guard on public.kit_designs;
create trigger kit_designs_guard before insert or update on public.kit_designs
  for each row execute function private.kit_design_guard();

-- A shared design (or one of my own) for its link page.
create or replace function public.shared_kit_design(p_id uuid)
returns table (id uuid, name text, design jsonb, handle text, avatar text, created_at timestamptz, is_mine boolean)
language plpgsql security definer set search_path = '' as $$
begin
  perform private.throttle('library', 300, 1500);
  return query
    select d.id, d.name, d.design, p.handle, p.avatar, d.created_at, d.user_id = (select auth.uid())
      from public.kit_designs d
      left join public.profiles p on p.id = d.user_id
     where d.id = p_id and (d.shared or d.user_id = (select auth.uid()));
end $$;
revoke execute on function public.shared_kit_design(uuid) from public;
grant execute on function public.shared_kit_design(uuid) to anon, authenticated;
