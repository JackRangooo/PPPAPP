create extension if not exists pgcrypto;

drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  nickname text not null,
  password_hash text,
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

do $$
declare
  v_constraint text;
begin
  select c.conname
  into v_constraint
  from pg_constraint c
  join pg_class t on t.oid = c.conrelid
  join pg_namespace n on n.oid = t.relnamespace
  join unnest(c.conkey) as cols(attnum) on true
  join pg_attribute a on a.attrelid = t.oid and a.attnum = cols.attnum
  where n.nspname = 'public'
    and t.relname = 'profiles'
    and c.contype = 'f'
    and a.attname = 'id'
  limit 1;

  if v_constraint is not null then
    execute format('alter table public.profiles drop constraint %I', v_constraint);
  end if;
end;
$$;

alter table public.profiles alter column id set default gen_random_uuid();
alter table public.profiles add column if not exists nickname text;
alter table public.profiles add column if not exists password_hash text;
alter table public.profiles add column if not exists email text not null default '';
alter table public.profiles add column if not exists display_name text not null default 'Player';
alter table public.profiles add column if not exists avatar_url text not null default '';
alter table public.profiles add column if not exists casual_stars integer not null default 0;
alter table public.profiles add column if not exists casual_wins integer not null default 0;
alter table public.profiles add column if not exists casual_losses integer not null default 0;
alter table public.profiles add column if not exists ranked_points integer not null default 0;
alter table public.profiles add column if not exists ranked_wins integer not null default 0;
alter table public.profiles add column if not exists ranked_losses integer not null default 0;
alter table public.profiles add column if not exists average_rank integer not null default 0;
alter table public.profiles add column if not exists tournaments_played integer not null default 0;
alter table public.profiles add column if not exists inventory jsonb not null default '{"trophies":[],"titles":["Novice Player"]}'::jsonb;
alter table public.profiles add column if not exists showcase jsonb not null default '[{"slotId":1,"trophyId":null},{"slotId":2,"trophyId":null},{"slotId":3,"trophyId":null}]'::jsonb;
alter table public.profiles add column if not exists selected_title text not null default 'Novice Player';
alter table public.profiles add column if not exists theme text not null default 'dark';
alter table public.profiles add column if not exists language text not null default 'en';
alter table public.profiles add column if not exists created_at timestamptz not null default timezone('utc', now());
alter table public.profiles add column if not exists updated_at timestamptz not null default timezone('utc', now());

update public.profiles
set nickname = 'player-' || substr(id::text, 1, 8)
where nickname is null or btrim(nickname) = '';

update public.profiles
set display_name = nickname
where display_name is null or btrim(display_name) = '';

update public.profiles
set inventory = '{"trophies":[],"titles":["Novice Player"]}'::jsonb
where inventory is null;

update public.profiles
set showcase = '[{"slotId":1,"trophyId":null},{"slotId":2,"trophyId":null},{"slotId":3,"trophyId":null}]'::jsonb
where showcase is null;

update public.profiles
set selected_title = 'Novice Player'
where selected_title is null or btrim(selected_title) = '';

update public.profiles
set theme = 'dark'
where theme not in ('dark', 'light') or theme is null;

update public.profiles
set language = 'en'
where language not in ('en', 'zh') or language is null;

alter table public.profiles alter column nickname set not null;

create unique index if not exists profiles_nickname_unique on public.profiles (lower(nickname));

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

create table if not exists public.app_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  token_hash text not null unique,
  created_at timestamptz not null default timezone('utc', now()),
  last_seen_at timestamptz not null default timezone('utc', now()),
  expires_at timestamptz not null,
  revoked_at timestamptz
);

alter table public.app_sessions alter column id set default gen_random_uuid();
create index if not exists app_sessions_user_id_idx on public.app_sessions (user_id);
create index if not exists matches_player1_id_idx on public.matches (player1_id);
create index if not exists matches_player2_id_idx on public.matches (player2_id);
create index if not exists matches_created_at_idx on public.matches (created_at desc);
create index if not exists tournaments_status_idx on public.tournaments (status, start_date desc);

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

create or replace function public.hash_session_token(p_token text)
returns text
language sql
immutable
strict
as $$
  select encode(digest(p_token, 'sha256'), 'hex');
$$;
create or replace function public.get_session_record(
  p_session_token text,
  p_touch boolean default true
)
returns public.app_sessions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session public.app_sessions;
begin
  if p_session_token is null or btrim(p_session_token) = '' then
    raise exception 'Please sign in again.';
  end if;

  select *
  into v_session
  from public.app_sessions
  where token_hash = public.hash_session_token(p_session_token)
    and revoked_at is null
    and expires_at > timezone('utc', now())
  order by created_at desc
  limit 1
  for update;

  if v_session.id is null then
    raise exception 'Session expired. Please sign in again.';
  end if;

  if p_touch then
    update public.app_sessions
    set
      last_seen_at = timezone('utc', now()),
      expires_at = greatest(v_session.expires_at, timezone('utc', now()) + interval '180 days')
    where id = v_session.id
    returning * into v_session;
  end if;

  return v_session;
end;
$$;

create or replace function public.current_profile_from_session(
  p_session_token text,
  p_touch boolean default true
)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session public.app_sessions;
  v_profile public.profiles;
begin
  v_session := public.get_session_record(p_session_token, p_touch);

  select *
  into v_profile
  from public.profiles
  where id = v_session.user_id;

  if v_profile.id is null then
    raise exception 'Profile not found.';
  end if;

  return v_profile;
end;
$$;

create or replace function public.issue_auth_payload(p_profile public.profiles)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_raw_token text := encode(gen_random_bytes(32), 'hex');
  v_session public.app_sessions;
begin
  insert into public.app_sessions (user_id, token_hash, expires_at)
  values (
    p_profile.id,
    public.hash_session_token(v_raw_token),
    timezone('utc', now()) + interval '180 days'
  )
  returning * into v_session;

  return jsonb_build_object(
    'session',
    jsonb_build_object(
      'token', v_raw_token,
      'user_id', p_profile.id,
      'nickname', p_profile.nickname,
      'expires_at', v_session.expires_at
    ),
    'profile',
    to_jsonb(p_profile)
  );
end;
$$;

create or replace function public.register_with_password(
  p_nickname text,
  p_password text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_nickname text := btrim(coalesce(p_nickname, ''));
  v_profile public.profiles;
begin
  if char_length(v_nickname) < 3 then
    raise exception 'Nickname must be at least 3 characters.';
  end if;

  if char_length(v_nickname) > 24 then
    raise exception 'Nickname must be 24 characters or fewer.';
  end if;

  if char_length(coalesce(p_password, '')) < 8 then
    raise exception 'Password must be at least 8 characters.';
  end if;

  if exists (
    select 1
    from public.profiles
    where lower(nickname) = lower(v_nickname)
  ) then
    raise exception 'This nickname is already taken.';
  end if;

  insert into public.profiles (
    nickname,
    password_hash,
    email,
    display_name,
    avatar_url
  )
  values (
    v_nickname,
    crypt(p_password, gen_salt('bf')),
    '',
    v_nickname,
    ''
  )
  returning * into v_profile;

  return public.issue_auth_payload(v_profile);
end;
$$;

create or replace function public.login_with_password(
  p_nickname text,
  p_password text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_nickname text := btrim(coalesce(p_nickname, ''));
  v_profile public.profiles;
begin
  select *
  into v_profile
  from public.profiles
  where lower(nickname) = lower(v_nickname)
  limit 1;

  if v_profile.id is null or v_profile.password_hash is null then
    raise exception 'Nickname or password is incorrect.';
  end if;

  if crypt(coalesce(p_password, ''), v_profile.password_hash) <> v_profile.password_hash then
    raise exception 'Nickname or password is incorrect.';
  end if;

  return public.issue_auth_payload(v_profile);
end;
$$;

create or replace function public.restore_password_session(
  p_session_token text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session public.app_sessions;
  v_profile public.profiles;
begin
  begin
    v_session := public.get_session_record(p_session_token, true);

    select *
    into v_profile
    from public.profiles
    where id = v_session.user_id;

    if v_profile.id is null then
      return null;
    end if;

    return jsonb_build_object(
      'session',
      jsonb_build_object(
        'token', p_session_token,
        'user_id', v_profile.id,
        'nickname', v_profile.nickname,
        'expires_at', v_session.expires_at
      ),
      'profile',
      to_jsonb(v_profile)
    );
  exception when others then
    return null;
  end;
end;
$$;

create or replace function public.logout_password_session(
  p_session_token text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_session_token is null or btrim(p_session_token) = '' then
    return;
  end if;

  update public.app_sessions
  set revoked_at = timezone('utc', now())
  where token_hash = public.hash_session_token(p_session_token)
    and revoked_at is null;
end;
$$;

create or replace function public.get_current_profile(
  p_session_token text
)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
begin
  return public.current_profile_from_session(p_session_token, true);
end;
$$;

create or replace function public.get_player_profile(
  p_session_token text,
  p_user_id uuid
)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles;
begin
  perform public.current_profile_from_session(p_session_token, false);

  select *
  into v_profile
  from public.profiles
  where id = p_user_id;

  if v_profile.id is null then
    return null;
  end if;

  return v_profile;
end;
$$;

create or replace function public.update_profile_preferences(
  p_session_token text,
  p_theme text default null,
  p_language text default null,
  p_selected_title text default null,
  p_showcase jsonb default null
)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles;
begin
  v_profile := public.current_profile_from_session(p_session_token, false);

  if p_theme is not null and p_theme not in ('dark', 'light') then
    raise exception 'Unsupported theme.';
  end if;

  if p_language is not null and p_language not in ('en', 'zh') then
    raise exception 'Unsupported language.';
  end if;

  update public.profiles
  set
    theme = coalesce(p_theme, theme),
    language = coalesce(p_language, language),
    selected_title = case
      when p_selected_title is null then selected_title
      when exists (
        select 1
        from jsonb_array_elements_text(coalesce(inventory -> 'titles', '[]'::jsonb)) as title(value)
        where title.value = p_selected_title
      ) then p_selected_title
      else selected_title
    end,
    showcase = case
      when p_showcase is null then showcase
      else p_showcase
    end
  where id = v_profile.id
  returning * into v_profile;

  return v_profile;
end;
$$;

create or replace function public.rename_profile_display_name(
  p_session_token text,
  p_display_name text
)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles;
  v_display_name text := left(btrim(coalesce(p_display_name, '')), 40);
begin
  if char_length(v_display_name) = 0 then
    raise exception 'Display name cannot be empty.';
  end if;

  v_profile := public.current_profile_from_session(p_session_token, false);

  update public.profiles
  set display_name = v_display_name
  where id = v_profile.id
  returning * into v_profile;

  return v_profile;
end;
$$;
create or replace function public.list_profiles_for_user(
  p_session_token text,
  p_search text default null,
  p_limit integer default 100
)
returns setof public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_requester public.profiles;
  v_search text := nullif(btrim(coalesce(p_search, '')), '');
  v_limit integer := greatest(1, least(coalesce(p_limit, 100), 100));
begin
  v_requester := public.current_profile_from_session(p_session_token, false);

  return query
  select *
  from public.profiles
  where v_search is null
    or display_name ilike '%' || v_search || '%'
    or nickname ilike '%' || v_search || '%'
  order by lower(display_name), created_at asc
  limit v_limit;
end;
$$;

create or replace function public.list_leaderboard_profiles(
  p_session_token text
)
returns setof public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_requester public.profiles;
begin
  v_requester := public.current_profile_from_session(p_session_token, false);

  return query
  select *
  from public.profiles
  order by casual_stars desc, ranked_points desc, casual_wins desc, created_at asc;
end;
$$;

create or replace function public.list_recent_matches_for_user(
  p_session_token text,
  p_limit integer default 8
)
returns setof public.matches
language plpgsql
security definer
set search_path = public
as $$
declare
  v_requester public.profiles;
  v_limit integer := greatest(1, least(coalesce(p_limit, 8), 1000));
begin
  v_requester := public.current_profile_from_session(p_session_token, false);

  return query
  select *
  from public.matches
  where player1_id = v_requester.id
     or player2_id = v_requester.id
  order by created_at desc
  limit v_limit;
end;
$$;

create or replace function public.list_active_casual_matches_for_user(
  p_session_token text
)
returns setof public.matches
language plpgsql
security definer
set search_path = public
as $$
declare
  v_requester public.profiles;
begin
  v_requester := public.current_profile_from_session(p_session_token, false);

  return query
  select *
  from public.matches
  where type = 'casual'
    and status in ('pending', 'ongoing')
    and (player1_id = v_requester.id or player2_id = v_requester.id)
  order by updated_at desc;
end;
$$;

create or replace function public.get_match_for_user(
  p_session_token text,
  p_match_id uuid
)
returns public.matches
language plpgsql
security definer
set search_path = public
as $$
declare
  v_requester public.profiles;
  v_match public.matches;
begin
  v_requester := public.current_profile_from_session(p_session_token, false);

  select *
  into v_match
  from public.matches
  where id = p_match_id
    and (player1_id = v_requester.id or player2_id = v_requester.id)
  limit 1;

  if v_match.id is null then
    return null;
  end if;

  return v_match;
end;
$$;

create or replace function public.create_match_request(
  p_session_token text,
  p_opponent_id uuid,
  p_match_type text default 'casual'
)
returns public.matches
language plpgsql
security definer
set search_path = public
as $$
declare
  v_player1 public.profiles;
  v_player2 public.profiles;
  v_match public.matches;
  v_existing_match_id uuid;
begin
  v_player1 := public.current_profile_from_session(p_session_token, false);

  if v_player1.id = p_opponent_id then
    raise exception 'You cannot challenge yourself.';
  end if;

  if p_match_type not in ('casual', 'ranked') then
    raise exception 'Unsupported match type.';
  end if;

  select *
  into v_player2
  from public.profiles
  where id = p_opponent_id;

  if v_player2.id is null then
    raise exception 'Opponent not found.';
  end if;

  select id
  into v_existing_match_id
  from public.matches
  where type = p_match_type
    and status in ('pending', 'ongoing')
    and (
      (player1_id = v_player1.id and player2_id = v_player2.id)
      or
      (player1_id = v_player2.id and player2_id = v_player1.id)
    )
  limit 1;

  if v_existing_match_id is not null then
    raise exception 'An active challenge already exists between these players.';
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
  p_session_token text,
  p_match_id uuid,
  p_action text
)
returns public.matches
language plpgsql
security definer
set search_path = public
as $$
declare
  v_requester public.profiles;
  v_match public.matches;
  v_next_status text;
begin
  v_requester := public.current_profile_from_session(p_session_token, false);

  select *
  into v_match
  from public.matches
  where id = p_match_id
  for update;

  if v_match.id is null then
    raise exception 'Match not found.';
  end if;

  if v_requester.id <> v_match.player1_id and v_requester.id <> v_match.player2_id then
    raise exception 'You are not allowed to modify this match.';
  end if;

  if p_action = 'accept' then
    if v_requester.id <> v_match.player2_id or v_match.status <> 'pending' then
      raise exception 'This challenge cannot be accepted.';
    end if;
    v_next_status := 'ongoing';
  elsif p_action = 'decline' then
    if v_requester.id <> v_match.player2_id or v_match.status <> 'pending' then
      raise exception 'This challenge cannot be declined.';
    end if;
    v_next_status := 'declined';
  elsif p_action = 'cancel' then
    if v_requester.id <> v_match.player1_id or v_match.status <> 'pending' then
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
  p_session_token text,
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
  v_requester public.profiles;
  v_match public.matches;
  v_updated_match public.matches;
  v_caller_is_player1 boolean;
  v_counterpart_confirmed boolean;
  v_result text := 'waiting';
  v_winner_id uuid;
  v_loser_id uuid;
begin
  v_requester := public.current_profile_from_session(p_session_token, false);

  select *
  into v_match
  from public.matches
  where id = p_match_id
  for update;

  if v_match.id is null then
    raise exception 'Match not found.';
  end if;

  if v_match.status <> 'ongoing' then
    raise exception 'Only ongoing matches can accept scores.';
  end if;

  if v_requester.id <> v_match.player1_id and v_requester.id <> v_match.player2_id then
    raise exception 'You are not allowed to update this match.';
  end if;

  if p_my_score is null or p_opponent_score is null then
    raise exception 'Both scores are required.';
  end if;

  if p_my_score = p_opponent_score then
    raise exception 'Tie scores are not supported.';
  end if;

  v_caller_is_player1 := v_requester.id = v_match.player1_id;
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

create or replace function public.list_tournaments_for_user(
  p_session_token text
)
returns setof public.tournaments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_requester public.profiles;
begin
  v_requester := public.current_profile_from_session(p_session_token, false);

  return query
  select *
  from public.tournaments
  order by
    case status
      when 'registration' then 0
      when 'ongoing' then 1
      else 2
    end,
    start_date desc;
end;
$$;

create or replace function public.register_for_tournament(
  p_session_token text,
  p_tournament_id uuid
)
returns public.tournaments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_requester public.profiles;
  v_tournament public.tournaments;
begin
  v_requester := public.current_profile_from_session(p_session_token, false);

  select *
  into v_tournament
  from public.tournaments
  where id = p_tournament_id
  for update;

  if v_tournament.id is null then
    raise exception 'Tournament not found.';
  end if;

  if v_tournament.status <> 'registration' then
    raise exception 'Tournament registration is closed.';
  end if;

  if v_requester.id = any(v_tournament.participants) then
    return v_tournament;
  end if;

  update public.tournaments
  set participants = array_append(v_tournament.participants, v_requester.id)
  where id = p_tournament_id
  returning * into v_tournament;

  return v_tournament;
end;
$$;

create or replace function public.end_tournament(
  p_session_token text,
  p_tournament_id uuid
)
returns public.tournaments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_requester public.profiles;
  v_tournament public.tournaments;
  v_participants uuid[];
  v_shuffled uuid[];
  v_participant uuid;
  v_rank integer;
  v_trophy jsonb;
begin
  v_requester := public.current_profile_from_session(p_session_token, false);

  select *
  into v_tournament
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

  if not exists (
    select 1
    from public.tournaments
    where id <> p_tournament_id
      and status in ('registration', 'ongoing')
  ) then
    insert into public.tournaments (name, status, start_date, end_date)
    values (
      'Weekly Championship',
      'registration',
      timezone('utc', now()),
      timezone('utc', now()) + interval '7 days'
    );
  end if;

  return v_tournament;
end;
$$;

alter table public.profiles enable row level security;
alter table public.matches enable row level security;
alter table public.tournaments enable row level security;
alter table public.app_sessions enable row level security;

drop policy if exists "Authenticated users can read profiles" on public.profiles;
drop policy if exists "Users can insert their own profile" on public.profiles;
drop policy if exists "Users can update their own profile" on public.profiles;
drop policy if exists "Participants can read matches" on public.matches;
drop policy if exists "Authenticated users can read tournaments" on public.tournaments;

grant execute on function public.register_with_password(text, text) to anon, authenticated;
grant execute on function public.login_with_password(text, text) to anon, authenticated;
grant execute on function public.restore_password_session(text) to anon, authenticated;
grant execute on function public.logout_password_session(text) to anon, authenticated;
grant execute on function public.get_current_profile(text) to anon, authenticated;
grant execute on function public.get_player_profile(text, uuid) to anon, authenticated;
grant execute on function public.update_profile_preferences(text, text, text, text, jsonb) to anon, authenticated;
grant execute on function public.rename_profile_display_name(text, text) to anon, authenticated;
grant execute on function public.list_profiles_for_user(text, text, integer) to anon, authenticated;
grant execute on function public.list_leaderboard_profiles(text) to anon, authenticated;
grant execute on function public.list_recent_matches_for_user(text, integer) to anon, authenticated;
grant execute on function public.list_active_casual_matches_for_user(text) to anon, authenticated;
grant execute on function public.get_match_for_user(text, uuid) to anon, authenticated;
grant execute on function public.create_match_request(text, uuid, text) to anon, authenticated;
grant execute on function public.change_match_status(text, uuid, text) to anon, authenticated;
grant execute on function public.submit_match_score(text, uuid, integer, integer) to anon, authenticated;
grant execute on function public.list_tournaments_for_user(text) to anon, authenticated;
grant execute on function public.register_for_tournament(text, uuid) to anon, authenticated;
grant execute on function public.end_tournament(text, uuid) to anon, authenticated;

insert into public.tournaments (name, status, start_date, end_date)
select
  'Weekly Championship',
  'registration',
  timezone('utc', now()),
  timezone('utc', now()) + interval '7 days'
where not exists (
  select 1
  from public.tournaments
  where status in ('registration', 'ongoing')
);




