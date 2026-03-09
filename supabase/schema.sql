create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null default '',
  display_name text not null default 'Player',
  avatar_url text not null default '',
  casual_stars integer not null default 0,
  casual_wins integer not null default 0,
  casual_losses integer not null default 0,
  ranked_points integer not null default 0,
  ranked_wins integer not null default 0,
  ranked_losses integer not null default 0,
  average_rank integer not null default 0,
  tournaments_played integer not null default 0,
  inventory jsonb not null default '{"trophies":[],"titles":["Novice Player"]}'::jsonb,
  showcase jsonb not null default '[{"slotId":1,"trophyId":null},{"slotId":2,"trophyId":null},{"slotId":3,"trophyId":null}]'::jsonb,
  selected_title text not null default 'Novice Player',
  theme text not null default 'dark' check (theme in ('dark', 'light')),
  language text not null default 'en' check (language in ('en', 'zh')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  player1_id uuid not null references public.profiles (id) on delete cascade,
  player2_id uuid not null references public.profiles (id) on delete cascade,
  player1_name text not null,
  player2_name text not null,
  player1_photo text not null default '',
  player2_photo text not null default '',
  player1_score integer,
  player2_score integer,
  player1_confirmed boolean not null default false,
  player2_confirmed boolean not null default false,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'ongoing', 'completed', 'declined', 'cancelled')),
  type text not null default 'casual' check (type in ('casual', 'ranked')),
  winner_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.tournaments (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Weekly Championship',
  status text not null default 'registration' check (status in ('registration', 'ongoing', 'completed')),
  start_date timestamptz not null default timezone('utc', now()),
  end_date timestamptz not null default timezone('utc', now()) + interval '7 days',
  participants uuid[] not null default '{}'::uuid[],
  winner_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at
before update on public.profiles
for each row
execute procedure public.touch_updated_at();

drop trigger if exists matches_touch_updated_at on public.matches;
create trigger matches_touch_updated_at
before update on public.matches
for each row
execute procedure public.touch_updated_at();

drop trigger if exists tournaments_touch_updated_at on public.tournaments;
create trigger tournaments_touch_updated_at
before update on public.tournaments
for each row
execute procedure public.touch_updated_at();

create or replace function public.append_title(existing_inventory jsonb, new_title text)
returns jsonb
language sql
immutable
as $$
  with inventory as (
    select coalesce(existing_inventory, '{"trophies":[],"titles":[]}'::jsonb) as value
  ),
  titles as (
    select case
      when exists (
        select 1
        from jsonb_array_elements_text(coalesce((select value -> 'titles' from inventory), '[]'::jsonb)) as title(value)
        where title.value = new_title
      )
        then coalesce((select value -> 'titles' from inventory), '[]'::jsonb)
      else
        coalesce((select value -> 'titles' from inventory), '[]'::jsonb) || jsonb_build_array(new_title)
    end as value
  )
  select jsonb_build_object(
    'trophies', coalesce((select value -> 'trophies' from inventory), '[]'::jsonb),
    'titles', (select value from titles)
  );
$$;

create or replace function public.append_trophy(existing_inventory jsonb, new_trophy jsonb)
returns jsonb
language sql
immutable
as $$
  with inventory as (
    select coalesce(existing_inventory, '{"trophies":[],"titles":[]}'::jsonb) as value
  )
  select jsonb_build_object(
    'trophies', coalesce((select value -> 'trophies' from inventory), '[]'::jsonb) || jsonb_build_array(new_trophy),
    'titles', coalesce((select value -> 'titles' from inventory), '[]'::jsonb)
  );
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id,
    email,
    display_name,
    avatar_url
  )
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(coalesce(new.email, 'player@example.com'), '@', 1), 'Player'),
    coalesce(new.raw_user_meta_data ->> 'avatar_url', '')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute procedure public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.matches enable row level security;
alter table public.tournaments enable row level security;

drop policy if exists "Authenticated users can read profiles" on public.profiles;
create policy "Authenticated users can read profiles"
on public.profiles
for select
to authenticated
using (true);

drop policy if exists "Users can insert their own profile" on public.profiles;
create policy "Users can insert their own profile"
on public.profiles
for insert
to authenticated
with check (auth.uid() = id);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "Participants can read matches" on public.matches;
create policy "Participants can read matches"
on public.matches
for select
to authenticated
using (auth.uid() = player1_id or auth.uid() = player2_id);

drop policy if exists "Authenticated users can read tournaments" on public.tournaments;
create policy "Authenticated users can read tournaments"
on public.tournaments
for select
to authenticated
using (true);

create or replace function public.create_match_request(
  p_opponent_id uuid,
  p_match_type text default 'casual'
)
returns public.matches
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_id uuid := auth.uid();
  v_player1 public.profiles;
  v_player2 public.profiles;
  v_match public.matches;
begin
  if v_caller_id is null then
    raise exception 'You must be signed in to create a match.';
  end if;

  if v_caller_id = p_opponent_id then
    raise exception 'You cannot challenge yourself.';
  end if;

  select * into v_player1 from public.profiles where id = v_caller_id;
  select * into v_player2 from public.profiles where id = p_opponent_id;

  if v_player1.id is null or v_player2.id is null then
    raise exception 'Both players must exist before a challenge can be created.';
  end if;

  insert into public.matches (
    player1_id,
    player2_id,
    player1_name,
    player2_name,
    player1_photo,
    player2_photo,
    type,
    status
  )
  values (
    v_player1.id,
    v_player2.id,
    v_player1.display_name,
    v_player2.display_name,
    v_player1.avatar_url,
    v_player2.avatar_url,
    p_match_type,
    'pending'
  )
  returning * into v_match;

  return v_match;
end;
$$;

create or replace function public.change_match_status(
  p_match_id uuid,
  p_action text
)
returns public.matches
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_id uuid := auth.uid();
  v_match public.matches;
  v_next_status text;
begin
  if v_caller_id is null then
    raise exception 'You must be signed in to update a match.';
  end if;

  select * into v_match
  from public.matches
  where id = p_match_id
  for update;

  if v_match.id is null then
    raise exception 'Match not found.';
  end if;

  if v_caller_id <> v_match.player1_id and v_caller_id <> v_match.player2_id then
    raise exception 'You are not allowed to modify this match.';
  end if;

  if p_action = 'accept' then
    if v_caller_id <> v_match.player2_id or v_match.status <> 'pending' then
      raise exception 'This challenge cannot be accepted.';
    end if;
    v_next_status := 'ongoing';
  elsif p_action = 'decline' then
    if v_caller_id <> v_match.player2_id or v_match.status <> 'pending' then
      raise exception 'This challenge cannot be declined.';
    end if;
    v_next_status := 'declined';
  elsif p_action = 'cancel' then
    if v_caller_id <> v_match.player1_id or v_match.status <> 'pending' then
      raise exception 'This challenge cannot be cancelled.';
    end if;
    v_next_status := 'cancelled';
  else
    raise exception 'Unsupported match action.';
  end if;

  update public.matches
  set status = v_next_status
  where id = p_match_id
  returning * into v_match;

  return v_match;
end;
$$;

create or replace function public.submit_match_score(
  p_match_id uuid,
  p_my_score integer,
  p_opponent_score integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_id uuid := auth.uid();
  v_match public.matches;
  v_updated_match public.matches;
  v_caller_is_player1 boolean;
  v_counterpart_confirmed boolean;
  v_result text := 'waiting';
  v_winner_id uuid;
  v_loser_id uuid;
begin
  if v_caller_id is null then
    raise exception 'You must be signed in to submit a score.';
  end if;

  select * into v_match
  from public.matches
  where id = p_match_id
  for update;

  if v_match.id is null then
    raise exception 'Match not found.';
  end if;

  if v_match.status <> 'ongoing' then
    raise exception 'Only ongoing matches can accept scores.';
  end if;

  if v_caller_id <> v_match.player1_id and v_caller_id <> v_match.player2_id then
    raise exception 'You are not allowed to update this match.';
  end if;

  if p_my_score is null or p_opponent_score is null then
    raise exception 'Both scores are required.';
  end if;

  if p_my_score = p_opponent_score then
    raise exception 'Tie scores are not supported.';
  end if;

  v_caller_is_player1 := v_caller_id = v_match.player1_id;
  v_counterpart_confirmed := case
    when v_caller_is_player1 then v_match.player2_confirmed
    else v_match.player1_confirmed
  end;

  if not v_counterpart_confirmed then
    update public.matches
    set
      player1_score = case when v_caller_is_player1 then p_my_score else p_opponent_score end,
      player2_score = case when v_caller_is_player1 then p_opponent_score else p_my_score end,
      player1_confirmed = case when v_caller_is_player1 then true else player1_confirmed end,
      player2_confirmed = case when v_caller_is_player1 then player2_confirmed else true end
    where id = p_match_id
    returning * into v_updated_match;

    return jsonb_build_object('result', v_result, 'match', to_jsonb(v_updated_match));
  end if;

  if (
    (v_caller_is_player1 and p_my_score = v_match.player1_score and p_opponent_score = v_match.player2_score)
    or
    ((not v_caller_is_player1) and p_my_score = v_match.player2_score and p_opponent_score = v_match.player1_score)
  ) then
    v_winner_id := case
      when coalesce(v_match.player1_score, 0) > coalesce(v_match.player2_score, 0) then v_match.player1_id
      else v_match.player2_id
    end;
    v_loser_id := case
      when v_winner_id = v_match.player1_id then v_match.player2_id
      else v_match.player1_id
    end;

    update public.matches
    set
      player1_score = case when v_caller_is_player1 then p_my_score else p_opponent_score end,
      player2_score = case when v_caller_is_player1 then p_opponent_score else p_my_score end,
      player1_confirmed = true,
      player2_confirmed = true,
      status = 'completed',
      winner_id = v_winner_id
    where id = p_match_id
    returning * into v_updated_match;

    update public.profiles
    set
      casual_wins = casual_wins + 1,
      casual_stars = casual_stars + 1,
      inventory = public.append_title(inventory, 'Match Participant')
    where id = v_winner_id;

    update public.profiles
    set
      casual_losses = casual_losses + 1,
      casual_stars = greatest(casual_stars - 1, 0),
      inventory = public.append_title(inventory, 'Match Participant')
    where id = v_loser_id;

    v_result := 'completed';
    return jsonb_build_object('result', v_result, 'match', to_jsonb(v_updated_match));
  end if;

  update public.matches
  set
    player1_score = null,
    player2_score = null,
    player1_confirmed = false,
    player2_confirmed = false
  where id = p_match_id
  returning * into v_updated_match;

  v_result := 'reset';
  return jsonb_build_object('result', v_result, 'match', to_jsonb(v_updated_match));
end;
$$;

create or replace function public.register_for_tournament(
  p_tournament_id uuid
)
returns public.tournaments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_id uuid := auth.uid();
  v_tournament public.tournaments;
begin
  if v_caller_id is null then
    raise exception 'You must be signed in to register.';
  end if;

  select * into v_tournament
  from public.tournaments
  where id = p_tournament_id
  for update;

  if v_tournament.id is null then
    raise exception 'Tournament not found.';
  end if;

  if v_tournament.status <> 'registration' then
    raise exception 'Tournament registration is closed.';
  end if;

  if v_caller_id = any(v_tournament.participants) then
    return v_tournament;
  end if;

  update public.tournaments
  set participants = array_append(v_tournament.participants, v_caller_id)
  where id = p_tournament_id
  returning * into v_tournament;

  return v_tournament;
end;
$$;

create or replace function public.end_tournament(
  p_tournament_id uuid
)
returns public.tournaments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tournament public.tournaments;
  v_participants uuid[];
  v_shuffled uuid[];
  v_participant uuid;
  v_rank integer;
  v_trophy jsonb;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in to end a tournament.';
  end if;

  select * into v_tournament
  from public.tournaments
  where id = p_tournament_id
  for update;

  if v_tournament.id is null then
    raise exception 'Tournament not found.';
  end if;

  if v_tournament.status = 'completed' then
    return v_tournament;
  end if;

  v_participants := coalesce(v_tournament.participants, '{}'::uuid[]);

  if coalesce(array_length(v_participants, 1), 0) = 0 then
    raise exception 'A tournament needs participants before it can be completed.';
  end if;

  select coalesce(array_agg(participant order by random()), '{}'::uuid[])
  into v_shuffled
  from unnest(v_participants) as participant;

  foreach v_participant in array v_participants
  loop
    update public.profiles
    set
      tournaments_played = tournaments_played + 1,
      inventory = public.append_title(inventory, 'Tournament Participant')
    where id = v_participant;
  end loop;

  for v_rank in 1..least(3, coalesce(array_length(v_shuffled, 1), 0))
  loop
    v_trophy := jsonb_build_object(
      'id', gen_random_uuid()::text,
      'name', case
        when v_rank = 1 then 'Gold Cup'
        when v_rank = 2 then 'Silver Cup'
        else 'Bronze Cup'
      end,
      'tournamentName', v_tournament.name,
      'rank', v_rank,
      'date', to_char(current_date, 'YYYY-MM-DD')
    );

    update public.profiles
    set inventory = public.append_trophy(inventory, v_trophy)
    where id = v_shuffled[v_rank];
  end loop;

  update public.tournaments
  set
    status = 'completed',
    winner_id = v_shuffled[1]
  where id = p_tournament_id
  returning * into v_tournament;

  return v_tournament;
end;
$$;

grant execute on function public.create_match_request(uuid, text) to authenticated;
grant execute on function public.change_match_status(uuid, text) to authenticated;
grant execute on function public.submit_match_score(uuid, integer, integer) to authenticated;
grant execute on function public.register_for_tournament(uuid) to authenticated;
grant execute on function public.end_tournament(uuid) to authenticated;

insert into public.tournaments (name, status, start_date, end_date)
select
  'Weekly Championship',
  'registration',
  timezone('utc', now()),
  timezone('utc', now()) + interval '7 days'
where not exists (
  select 1
  from public.tournaments
);

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'profiles'
  ) then
    alter publication supabase_realtime add table public.profiles;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'matches'
  ) then
    alter publication supabase_realtime add table public.matches;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'tournaments'
  ) then
    alter publication supabase_realtime add table public.tournaments;
  end if;
end;
$$;
