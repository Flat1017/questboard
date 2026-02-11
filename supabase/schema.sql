create extension if not exists pgcrypto;

create type guild_role as enum ('ADMIN', 'MEMBER');
create type membership_status as enum ('PENDING', 'APPROVED', 'REJECTED');
create type quest_status as enum ('OPEN', 'DOING', 'DONE');
create type pin_variant as enum ('IRON', 'NAIL', 'RED_PUSHPIN');
create type quest_action as enum ('ACCEPTED', 'UNACCEPTED', 'COMPLETED', 'REOPENED');

create table if not exists user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  role guild_role not null default 'MEMBER',
  membership_status membership_status not null default 'PENDING',
  total_xp integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists quests (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  detail text,
  difficulty smallint not null check (difficulty between 1 and 5),
  status quest_status not null default 'OPEN',
  due_date date not null,
  position integer not null default 0,
  parchment_variant smallint not null check (parchment_variant between 1 and 16),
  pin_variant pin_variant not null,
  pin_offset_px smallint not null default 0,
  created_by uuid not null references user_profiles(id),
  completed_by uuid references user_profiles(id),
  completed_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists quest_acceptances (
  quest_id uuid not null references quests(id) on delete cascade,
  user_id uuid not null references user_profiles(id) on delete cascade,
  accepted_at timestamptz not null default now(),
  primary key (quest_id, user_id)
);

create table if not exists quest_audit_logs (
  id uuid primary key default gen_random_uuid(),
  quest_id uuid not null references quests(id) on delete cascade,
  actor_id uuid not null references user_profiles(id) on delete cascade,
  action quest_action not null,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists quest_achievement_logs (
  id uuid primary key default gen_random_uuid(),
  quest_id uuid not null references quests(id) on delete cascade,
  actor_id uuid not null references user_profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists idx_quests_status_position on quests(status, position);
create index if not exists idx_quests_archived_at on quests(archived_at);
create index if not exists idx_quest_achievement_logs_created_at on quest_achievement_logs(created_at desc);

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_user_profiles_updated_at
before update on user_profiles
for each row
execute procedure set_updated_at();

create trigger trg_quests_updated_at
before update on quests
for each row
execute procedure set_updated_at();

create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
as $$
declare
  _name text;
begin
  _name := coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1));
  insert into public.user_profiles(id, display_name)
  values (new.id, _name)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure handle_new_user();

create or replace function archive_expired_done_quests()
returns integer
language plpgsql
security definer
as $$
declare
  _count integer;
begin
  update quests
  set archived_at = now()
  where status = 'DONE'
    and archived_at is null
    and completed_at <= now() - interval '14 days';

  get diagnostics _count = row_count;
  return _count;
end;
$$;

create or replace function increment_user_xp(user_id_param uuid, amount_param integer)
returns void
language plpgsql
security definer
as $$
begin
  update user_profiles
  set total_xp = greatest(0, total_xp + amount_param)
  where id = user_id_param;
end;
$$;

grant execute on function archive_expired_done_quests() to authenticated;
grant execute on function increment_user_xp(uuid, integer) to authenticated;

alter table user_profiles enable row level security;
alter table quests enable row level security;
alter table quest_acceptances enable row level security;
alter table quest_audit_logs enable row level security;
alter table quest_achievement_logs enable row level security;

create policy "approved members can read profiles"
on user_profiles
for select
using (
  exists (
    select 1 from user_profiles p
    where p.id = auth.uid() and p.membership_status = 'APPROVED'
  )
);

create policy "users can update self profile basic"
on user_profiles
for update
using (id = auth.uid())
with check (id = auth.uid());

create policy "approved members can read quests"
on quests
for select
using (
  exists (
    select 1 from user_profiles p
    where p.id = auth.uid() and p.membership_status = 'APPROVED'
  )
);

create policy "admins create quests"
on quests
for insert
with check (
  exists (
    select 1 from user_profiles p
    where p.id = auth.uid() and p.role = 'ADMIN' and p.membership_status = 'APPROVED'
  )
);

create policy "approved members update quests"
on quests
for update
using (
  exists (
    select 1 from user_profiles p
    where p.id = auth.uid() and p.membership_status = 'APPROVED'
  )
)
with check (
  exists (
    select 1 from user_profiles p
    where p.id = auth.uid() and p.membership_status = 'APPROVED'
  )
);

create policy "approved members read acceptances"
on quest_acceptances
for select
using (
  exists (
    select 1 from user_profiles p
    where p.id = auth.uid() and p.membership_status = 'APPROVED'
  )
);

create policy "approved members manage own acceptances"
on quest_acceptances
for all
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "approved members read audit logs"
on quest_audit_logs
for select
using (
  exists (
    select 1 from user_profiles p
    where p.id = auth.uid() and p.membership_status = 'APPROVED'
  )
);

create policy "approved members insert audit logs"
on quest_audit_logs
for insert
with check (
  exists (
    select 1 from user_profiles p
    where p.id = auth.uid() and p.membership_status = 'APPROVED'
  )
);

create policy "approved members read achievement logs"
on quest_achievement_logs
for select
using (
  exists (
    select 1 from user_profiles p
    where p.id = auth.uid() and p.membership_status = 'APPROVED'
  )
);

create policy "approved members insert achievement logs"
on quest_achievement_logs
for insert
with check (
  exists (
    select 1 from user_profiles p
    where p.id = auth.uid() and p.membership_status = 'APPROVED'
  )
);
