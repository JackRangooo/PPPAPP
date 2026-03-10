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
  coins integer not null default 0,
  inventory jsonb not null default '{"trophies":[],"titles":["Novice Player"],"items":[]}'::jsonb,
  showcase jsonb not null default '[{"slotId":1,"trophyId":null},{"slotId":2,"trophyId":null},{"slotId":3,"trophyId":null}]'::jsonb,
  selected_title text not null default 'Novice Player',
  theme text not null default 'dark' check (theme in ('dark', 'light')),
  language text not null default 'en' check (language in ('en', 'zh')),
  is_root boolean not null default false,
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
alter table public.profiles add column if not exists coins integer not null default 0;
alter table public.profiles add column if not exists inventory jsonb not null default '{"trophies":[],"titles":["Novice Player"],"items":[]}'::jsonb;
alter table public.profiles add column if not exists showcase jsonb not null default '[{"slotId":1,"trophyId":null},{"slotId":2,"trophyId":null},{"slotId":3,"trophyId":null}]'::jsonb;
alter table public.profiles add column if not exists selected_title text not null default 'Novice Player';
alter table public.profiles add column if not exists theme text not null default 'dark';
alter table public.profiles add column if not exists language text not null default 'en';
alter table public.profiles add column if not exists is_root boolean not null default false;
alter table public.profiles add column if not exists created_at timestamptz not null default timezone('utc', now());
alter table public.profiles add column if not exists updated_at timestamptz not null default timezone('utc', now());

update public.profiles
set nickname = 'player-' || substr(id::text, 1, 8)
where nickname is null or btrim(nickname) = '';

update public.profiles
set display_name = nickname
where display_name is null or btrim(display_name) = '';

update public.profiles
set inventory = '{"trophies":[],"titles":["Novice Player"],"items":[]}'::jsonb
where inventory is null;

update public.profiles
set coins = 0
where coins is null;

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

update public.profiles
set is_root = false
where is_root is null;

do $$
begin
  if exists (select 1 from public.profiles)
     and not exists (select 1 from public.profiles where is_root) then
    update public.profiles
    set is_root = true
    where id = (
      select id
      from public.profiles
      order by created_at asc, id asc
      limit 1
    );
  end if;
end;
$$;

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
  source text not null default 'system' check (source in ('system', 'admin')),
  start_date timestamptz not null default timezone('utc', now()),
  end_date timestamptz not null default timezone('utc', now()) + interval '7 days',
  participants uuid[] not null default '{}'::uuid[],
  winner_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.tournaments drop constraint if exists tournaments_status_check;
alter table public.tournaments
  add constraint tournaments_status_check
  check (status in ('registration', 'ongoing', 'completed', 'cancelled'));
alter table public.tournaments add column if not exists source text not null default 'system';
alter table public.tournaments drop constraint if exists tournaments_source_check;
alter table public.tournaments
  add constraint tournaments_source_check
  check (source in ('system', 'admin'));
alter table public.tournaments add column if not exists runner_up_id uuid references public.profiles (id) on delete set null;
alter table public.tournaments add column if not exists third_place_id uuid references public.profiles (id) on delete set null;
alter table public.tournaments add column if not exists admin_user_id uuid references public.profiles (id) on delete set null;
alter table public.tournaments add column if not exists format text not null default 'single_elimination_third';
alter table public.tournaments add column if not exists bracket jsonb not null default '{"size":0,"matches":[]}'::jsonb;
alter table public.tournaments add column if not exists timeline jsonb not null default '[]'::jsonb;
alter table public.tournaments add column if not exists rewards_granted boolean not null default false;

update public.tournaments
set format = 'single_elimination_third'
where format is null or btrim(format) = '';

update public.tournaments
set source = case
  when coalesce(name, '') = 'Weekly Championship' then 'system'
  else 'admin'
end
where source is null
   or btrim(source) = ''
   or source not in ('system', 'admin');

update public.tournaments
set bracket = '{"size":0,"matches":[]}'::jsonb
where bracket is null;

update public.tournaments
set timeline = '[]'::jsonb
where timeline is null;

update public.tournaments
set rewards_granted = false
where rewards_granted is null;

create table if not exists public.tournament_match_comments (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments (id) on delete cascade,
  match_id uuid not null,
  user_id uuid not null references public.profiles (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists tournament_match_comments_tournament_idx
  on public.tournament_match_comments (tournament_id, created_at desc);
create index if not exists tournament_match_comments_match_idx
  on public.tournament_match_comments (match_id, created_at asc);
create table if not exists public.app_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  token_hash text not null unique,
  created_at timestamptz not null default timezone('utc', now()),
  last_seen_at timestamptz not null default timezone('utc', now()),
  expires_at timestamptz not null,
  revoked_at timestamptz
);

create table if not exists public.shop_products (
  id text primary key,
  name text not null,
  description text not null,
  kind text not null,
  price_coins integer not null check (price_coins >= 0),
  effect_hint text not null default '',
  effect_status text not null default 'coming_soon',
  is_active boolean not null default true,
  sort_order integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists shop_products_active_idx on public.shop_products (is_active, sort_order asc);

insert into public.shop_products (
  id,
  name,
  description,
  kind,
  price_coins,
  effect_hint,
  effect_status,
  sort_order,
  metadata
)
values (
  'select_card',
  'Self-Select Card',
  'Lets you choose your first-round opponent in a future tournament. Purchase only for now; effect comes later.',
  'card',
  60,
  'Reserve this card now. Tournament effect will be wired in a later release.',
  'coming_soon',
  10,
  '{"futureEffect":"Choose your first-round opponent in a tournament."}'::jsonb
)
on conflict (id) do update
set
  name = excluded.name,
  description = excluded.description,
  kind = excluded.kind,
  price_coins = excluded.price_coins,
  effect_hint = excluded.effect_hint,
  effect_status = excluded.effect_status,
  is_active = true,
  sort_order = excluded.sort_order,
  metadata = excluded.metadata,
  updated_at = timezone('utc', now());

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

create or replace function public.normalize_inventory(existing_inventory jsonb)
returns jsonb
language sql
immutable
as $$
  with inventory as (
    select coalesce(existing_inventory, '{}'::jsonb) as value
  )
  select jsonb_build_object(
    'trophies',
    case
      when jsonb_typeof((select value -> 'trophies' from inventory)) = 'array'
        then coalesce((select value -> 'trophies' from inventory), '[]'::jsonb)
      else '[]'::jsonb
    end,
    'titles',
    case
      when jsonb_typeof((select value -> 'titles' from inventory)) = 'array'
           and jsonb_array_length(coalesce((select value -> 'titles' from inventory), '[]'::jsonb)) > 0
        then coalesce((select value -> 'titles' from inventory), '[]'::jsonb)
      else '["Novice Player"]'::jsonb
    end,
    'items',
    case
      when jsonb_typeof((select value -> 'items' from inventory)) = 'array'
        then coalesce((select value -> 'items' from inventory), '[]'::jsonb)
      else '[]'::jsonb
    end
  );
$$;

update public.profiles
set inventory = public.normalize_inventory(inventory);

create or replace function public.append_title(existing_inventory jsonb, new_title text)
returns jsonb
language sql
immutable
as $$
  with inventory as (
    select public.normalize_inventory(existing_inventory) as value
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
    'titles', (select value from titles),
    'items', coalesce((select value -> 'items' from inventory), '[]'::jsonb)
  );
$$;

create or replace function public.append_trophy(existing_inventory jsonb, new_trophy jsonb)
returns jsonb
language sql
immutable
as $$
  with inventory as (
    select public.normalize_inventory(existing_inventory) as value
  )
  select jsonb_build_object(
    'trophies', coalesce((select value -> 'trophies' from inventory), '[]'::jsonb) || jsonb_build_array(new_trophy),
    'titles', coalesce((select value -> 'titles' from inventory), '[]'::jsonb),
    'items', coalesce((select value -> 'items' from inventory), '[]'::jsonb)
  );
$$;

create or replace function public.upsert_inventory_item(
  existing_inventory jsonb,
  p_product_id text,
  p_name text,
  p_description text,
  p_kind text,
  p_price_coins integer,
  p_effect_hint text,
  p_effect_status text,
  p_quantity integer default 1
)
returns jsonb
language sql
immutable
as $$
  with inventory as (
    select public.normalize_inventory(existing_inventory) as value
  ),
  items as (
    select coalesce((select value -> 'items' from inventory), '[]'::jsonb) as value
  ),
  existing_item as (
    select item.value
    from jsonb_array_elements((select value from items)) as item(value)
    where item.value ->> 'productId' = p_product_id
    limit 1
  ),
  next_item as (
    select jsonb_build_object(
      'productId', p_product_id,
      'name', p_name,
      'description', p_description,
      'kind', p_kind,
      'quantity', greatest(1, coalesce(p_quantity, 1))
        + coalesce(((select value ->> 'quantity' from existing_item))::integer, 0),
      'priceCoins', greatest(0, coalesce(p_price_coins, 0)),
      'effectHint', coalesce(p_effect_hint, ''),
      'effectStatus', coalesce(p_effect_status, 'coming_soon')
    ) as value
  ),
  merged_items as (
    select coalesce(
      (
        select jsonb_agg(
          case
            when item.value ->> 'productId' = p_product_id then (select value from next_item)
            else item.value
          end
        )
        from jsonb_array_elements((select value from items)) as item(value)
      ),
      '[]'::jsonb
    ) as value
  ),
  final_items as (
    select case
      when exists (select 1 from existing_item)
        then (select value from merged_items)
      else (select value from items) || jsonb_build_array((select value from next_item))
    end as value
  )
  select jsonb_build_object(
    'trophies', coalesce((select value -> 'trophies' from inventory), '[]'::jsonb),
    'titles', coalesce((select value -> 'titles' from inventory), '[]'::jsonb),
    'items', coalesce((select value from final_items), '[]'::jsonb)
  );
$$;

create or replace function public.hash_session_token(p_token text)
returns text
language sql
immutable
strict
set search_path = public, extensions
as $$
  select encode(extensions.digest(p_token, 'sha256'), 'hex');
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
  v_should_be_root boolean;
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
set search_path = public, extensions
as $$
declare
  v_raw_token text := encode(extensions.gen_random_bytes(32), 'hex');
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
set search_path = public, extensions
as $$
declare
  v_nickname text := btrim(coalesce(p_nickname, ''));
  v_profile public.profiles;
  v_should_be_root boolean;
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

  select not exists (
    select 1
    from public.profiles
    where is_root
  ) into v_should_be_root;

  insert into public.profiles (
    nickname,
    password_hash,
    email,
    display_name,
    avatar_url,
    is_root
  )
  values (
    v_nickname,
    extensions.crypt(p_password, extensions.gen_salt('bf')),
    '',
    v_nickname,
    '',
    v_should_be_root
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
set search_path = public, extensions
as $$
declare
  v_nickname text := btrim(coalesce(p_nickname, ''));
  v_profile public.profiles;
  v_should_be_root boolean;
begin
  select *
  into v_profile
  from public.profiles
  where lower(nickname) = lower(v_nickname)
  limit 1;

  if v_profile.id is null or v_profile.password_hash is null then
    raise exception 'Nickname or password is incorrect.';
  end if;

  if extensions.crypt(coalesce(p_password, ''), v_profile.password_hash) <> v_profile.password_hash then
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
  v_should_be_root boolean;
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
  v_should_be_root boolean;
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
  v_should_be_root boolean;
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

create or replace function public.update_profile_identity(
  p_session_token text,
  p_nickname text,
  p_display_name text,
  p_avatar_url text default null
)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles;
  v_nickname text := left(btrim(coalesce(p_nickname, '')), 24);
  v_display_name text := left(btrim(coalesce(p_display_name, '')), 40);
  v_avatar_url text := case
    when p_avatar_url is null then null
    else btrim(p_avatar_url)
  end;
begin
  if char_length(v_nickname) < 3 then
    raise exception 'Nickname must be at least 3 characters.';
  end if;

  if char_length(v_display_name) = 0 then
    raise exception 'Display name cannot be empty.';
  end if;

  if v_avatar_url is not null and char_length(v_avatar_url) > 400000 then
    raise exception 'Avatar image is too large.';
  end if;

  v_profile := public.current_profile_from_session(p_session_token, false);

  if exists (
    select 1
    from public.profiles
    where lower(nickname) = lower(v_nickname)
      and id <> v_profile.id
  ) then
    raise exception 'This nickname is already taken.';
  end if;

  update public.profiles
  set
    nickname = v_nickname,
    display_name = v_display_name,
    avatar_url = coalesce(v_avatar_url, avatar_url)
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
  where not coalesce(is_root, false)
  order by casual_stars desc, ranked_points desc, casual_wins desc, created_at asc;
end;
$$;

create or replace function public.list_shop_products_for_user(
  p_session_token text
)
returns setof public.shop_products
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
  from public.shop_products
  where is_active
  order by sort_order asc, created_at asc;
end;
$$;

create or replace function public.purchase_shop_item(
  p_session_token text,
  p_product_id text,
  p_quantity integer default 1
)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles;
  v_product public.shop_products;
  v_quantity integer := greatest(1, least(coalesce(p_quantity, 1), 20));
  v_total_cost integer;
begin
  v_profile := public.current_profile_from_session(p_session_token, false);

  select *
  into v_product
  from public.shop_products
  where id = btrim(coalesce(p_product_id, ''))
    and is_active
  limit 1;

  if v_product.id is null then
    raise exception 'This item is not available.';
  end if;

  v_total_cost := v_product.price_coins * v_quantity;

  if coalesce(v_profile.coins, 0) < v_total_cost then
    raise exception 'Not enough coins for this purchase.';
  end if;

  update public.profiles
  set
    coins = coins - v_total_cost,
    inventory = public.upsert_inventory_item(
      inventory,
      v_product.id,
      v_product.name,
      v_product.description,
      v_product.kind,
      v_product.price_coins,
      v_product.effect_hint,
      v_product.effect_status,
      v_quantity
    )
  where id = v_profile.id
    and coins >= v_total_cost
  returning * into v_profile;

  if not found then
    raise exception 'Not enough coins for this purchase.';
  end if;

  return v_profile;
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
    where id = v_winner_id
      and not coalesce(is_root, false);

    update public.profiles
    set
      casual_losses = casual_losses + 1,
      casual_stars = greatest(casual_stars - 1, 0),
      inventory = public.append_title(inventory, 'Match Participant')
    where id = v_loser_id
      and not coalesce(is_root, false);

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

create or replace function public.ensure_system_tournament()
returns public.tournaments
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_tournament public.tournaments;
  v_tournament_id uuid := extensions.gen_random_uuid();
begin
  select *
  into v_tournament
  from public.tournaments
  where source = 'system'
    and status in ('registration', 'ongoing')
  order by start_date desc
  limit 1;

  if v_tournament.id is not null then
    return v_tournament;
  end if;

  insert into public.tournaments (
    id,
    name,
    status,
    source,
    start_date,
    end_date,
    format,
    bracket,
    timeline
  )
  values (
    v_tournament_id,
    'Weekly Championship',
    'registration',
    'system',
    timezone('utc', now()),
    timezone('utc', now()) + interval '7 days',
    'single_elimination_third',
    '{"size":0,"matches":[]}'::jsonb,
    jsonb_build_array(
      jsonb_build_object(
        'id', extensions.gen_random_uuid()::text,
        'type', 'registration_opened',
        'title', 'Weekly Championship registration is open',
        'description', 'Players can join the system bracket now.',
        'createdAt', timezone('utc', now()),
        'tournamentId', v_tournament_id,
        'matchId', null
      )
    )
  )
  returning * into v_tournament;

  return v_tournament;
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
      when 'completed' then 2
      else 3
    end,
    case source
      when 'system' then 0
      else 1
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

  if coalesce(array_length(v_tournament.participants, 1), 0) >= 8 then
    raise exception 'This tournament is already full.';
  end if;

  update public.tournaments
  set participants = array_append(v_tournament.participants, v_requester.id)
  where id = p_tournament_id
  returning * into v_tournament;

  perform public.ensure_system_tournament();

  return v_tournament;
end;
$$;

create or replace function public.get_tournament_round_coin_reward(p_round integer)
returns integer
language sql
immutable
as $$
  select case coalesce(p_round, 0)
    when 1 then 100
    when 2 then 50
    when 3 then 20
    else 10
  end;
$$;

create or replace function public.get_tournament_match_loser_id(p_match jsonb)
returns uuid
language sql
immutable
as $$
  select case
    when coalesce(p_match ->> 'winnerId', '') = '' then null
    when coalesce(p_match ->> 'winnerId', '') = coalesce(p_match ->> 'player1Id', '')
      then nullif(p_match ->> 'player2Id', '')::uuid
    when coalesce(p_match ->> 'winnerId', '') = coalesce(p_match ->> 'player2Id', '')
      then nullif(p_match ->> 'player1Id', '')::uuid
    else null
  end;
$$;

create or replace function public.award_tournament_rewards(
  p_tournament_id uuid
)
returns public.tournaments
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_tournament public.tournaments;
  v_participant uuid;
  v_elimination_round integer;
  v_coin_reward integer;
  v_points integer;
  v_trophy jsonb;
  v_participant_is_root boolean;
begin
  select *
  into v_tournament
  from public.tournaments
  where id = p_tournament_id
  for update;

  if v_tournament.id is null then
    raise exception 'Tournament not found.';
  end if;

  if v_tournament.rewards_granted then
    return v_tournament;
  end if;

  if v_tournament.status <> 'completed' then
    raise exception 'Tournament rewards can only be granted after completion.';
  end if;

  foreach v_participant in array coalesce(v_tournament.participants, '{}'::uuid[])
  loop
    select coalesce(is_root, false)
    into v_participant_is_root
    from public.profiles
    where id = v_participant;

    if coalesce(v_participant_is_root, false) then
      continue;
    end if;

    select max((match.value ->> 'round')::integer)
    into v_elimination_round
    from jsonb_array_elements(coalesce(v_tournament.bracket -> 'matches', '[]'::jsonb)) as match(value)
    where coalesce(match.value ->> 'status', '') in ('completed', 'walkover')
      and public.get_tournament_match_loser_id(match.value) = v_participant;

    v_coin_reward := case
      when v_elimination_round is null then 10
      else public.get_tournament_round_coin_reward(v_elimination_round)
    end;

    v_points := case
      when v_participant = v_tournament.winner_id then 10
      when v_participant = v_tournament.runner_up_id then 5
      when v_participant = v_tournament.third_place_id then 2
      else 0
    end;

    update public.profiles
    set
      tournaments_played = tournaments_played + 1,
      ranked_points = ranked_points + v_points,
      coins = coins + greatest(v_coin_reward, 10),
      inventory = public.append_title(inventory, 'Tournament Participant')
    where id = v_participant;

    if v_participant = v_tournament.winner_id then
      v_trophy := jsonb_build_object(
        'id', extensions.gen_random_uuid()::text,
        'name', 'Champion Trophy',
        'tournamentName', v_tournament.name,
        'rank', 1,
        'date', to_char(current_date, 'YYYY-MM-DD')
      );

      update public.profiles
      set inventory = public.append_trophy(inventory, v_trophy)
      where id = v_participant;
    elsif v_participant = v_tournament.runner_up_id then
      v_trophy := jsonb_build_object(
        'id', extensions.gen_random_uuid()::text,
        'name', 'Finalist Medal',
        'tournamentName', v_tournament.name,
        'rank', 2,
        'date', to_char(current_date, 'YYYY-MM-DD')
      );

      update public.profiles
      set inventory = public.append_trophy(inventory, v_trophy)
      where id = v_participant;
    elsif v_participant = v_tournament.third_place_id then
      v_trophy := jsonb_build_object(
        'id', extensions.gen_random_uuid()::text,
        'name', 'Bronze Medal',
        'tournamentName', v_tournament.name,
        'rank', 3,
        'date', to_char(current_date, 'YYYY-MM-DD')
      );

      update public.profiles
      set inventory = public.append_trophy(inventory, v_trophy)
      where id = v_participant;
    end if;
  end loop;

  update public.tournaments
  set rewards_granted = true
  where id = p_tournament_id
  returning * into v_tournament;

  perform public.ensure_system_tournament();

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
set search_path = public, extensions
as $$
declare
  v_requester public.profiles;
  v_tournament public.tournaments;
  v_participants uuid[];
  v_shuffled uuid[];
begin
  v_requester := public.current_profile_from_session(p_session_token, false);

  if not coalesce(v_requester.is_root, false) then
    raise exception 'Only the root admin can end a tournament.';
  end if;


  select *
  into v_tournament
  from public.tournaments
  where id = p_tournament_id
  for update;

  if v_tournament.id is null then
    raise exception 'Tournament not found.';
  end if;

  if v_tournament.status = 'completed' then
    if not coalesce(v_tournament.rewards_granted, false) then
      return public.award_tournament_rewards(v_tournament.id);
    end if;

    return v_tournament;
  end if;

  v_participants := coalesce(v_tournament.participants, '{}'::uuid[]);

  if coalesce(array_length(v_participants, 1), 0) = 0 then
    raise exception 'A tournament needs participants before it can be completed.';
  end if;

  select coalesce(array_agg(participant order by random()), '{}'::uuid[])
  into v_shuffled
  from unnest(v_participants) as participant;

  update public.tournaments
  set
    status = 'completed',
    winner_id = v_shuffled[1],
    runner_up_id = case when coalesce(array_length(v_shuffled, 1), 0) >= 2 then v_shuffled[2] else null end,
    third_place_id = case when coalesce(array_length(v_shuffled, 1), 0) >= 3 then v_shuffled[3] else null end,
    rewards_granted = false
  where id = p_tournament_id
  returning * into v_tournament;

  return public.award_tournament_rewards(v_tournament.id);
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

create or replace function public.get_tournament_bracket_match(
  p_bracket jsonb,
  p_match_id uuid
)
returns jsonb
language sql
immutable
set search_path = public
as $$
  select value
  from jsonb_array_elements(coalesce(p_bracket -> 'matches', '[]'::jsonb)) as value
  where value ->> 'id' = p_match_id::text
  limit 1;
$$;

create or replace function public.append_tournament_event(
  p_existing_timeline jsonb,
  p_event jsonb
)
returns jsonb
language sql
immutable
set search_path = public
as $$
  select coalesce(p_existing_timeline, '[]'::jsonb) || jsonb_build_array(p_event);
$$;

drop function if exists public.create_tournament(text, text);
create or replace function public.create_tournament(
  p_session_token text,
  p_name text default null,
  p_source text default 'admin'
)
returns public.tournaments
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_requester public.profiles;
  v_tournament public.tournaments;
  v_tournament_id uuid := extensions.gen_random_uuid();
  v_source text := case when p_source in ('system', 'admin') then p_source else 'admin' end;
  v_name text;
begin
  v_requester := public.current_profile_from_session(p_session_token, false);

  if not coalesce(v_requester.is_root, false) then
    raise exception 'Only the root admin can create a tournament.';
  end if;

  if v_source = 'system' then
    return public.ensure_system_tournament();
  end if;

  v_name := coalesce(nullif(btrim(coalesce(p_name, '')), ''), 'Admin Spotlight Cup');

  if exists (
    select 1
    from public.tournaments
    where status in ('registration', 'ongoing')
      and source = v_source
  ) then
    raise exception 'Finish or cancel the active % tournament before creating a new one.', v_source;
  end if;

  insert into public.tournaments (
    id,
    name,
    status,
    source,
    start_date,
    end_date,
    admin_user_id,
    format,
    bracket,
    timeline
  )
  values (
    v_tournament_id,
    v_name,
    'registration',
    v_source,
    timezone('utc', now()),
    timezone('utc', now()) + interval '7 days',
    v_requester.id,
    'single_elimination_third',
    '{"size":0,"matches":[]}'::jsonb,
    public.append_tournament_event(
      '[]'::jsonb,
      jsonb_build_object(
        'id', extensions.gen_random_uuid()::text,
        'type', 'registration_opened',
        'title', v_name || ' registration is open',
        'description', 'Players can join the bracket now.',
        'createdAt', timezone('utc', now()),
        'tournamentId', v_tournament_id,
        'matchId', null
      )
    )
  )
  returning * into v_tournament;

  return v_tournament;
end;
$$;

create or replace function public.start_tournament(
  p_session_token text,
  p_tournament_id uuid,
  p_bracket jsonb,
  p_timeline jsonb
)
returns public.tournaments
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_requester public.profiles;
  v_tournament public.tournaments;
begin
  v_requester := public.current_profile_from_session(p_session_token, false);

  if not coalesce(v_requester.is_root, false) then
    raise exception 'Only the root admin can start a tournament.';
  end if;

  select *
  into v_tournament
  from public.tournaments
  where id = p_tournament_id
  for update;

  if v_tournament.id is null then
    raise exception 'Tournament not found.';
  end if;

  if v_tournament.status <> 'registration' then
    raise exception 'Only tournaments in registration can be started.';
  end if;

  if coalesce(array_length(v_tournament.participants, 1), 0) < 4 then
    raise exception 'At least 4 players are required to start a tournament.';
  end if;

  if jsonb_typeof(coalesce(p_bracket, '{}'::jsonb)) <> 'object' then
    raise exception 'A valid bracket payload is required.';
  end if;

  if jsonb_typeof(coalesce(p_timeline, '[]'::jsonb)) <> 'array' then
    raise exception 'A valid tournament timeline is required.';
  end if;

  update public.tournaments
  set
    status = 'ongoing',
    admin_user_id = v_requester.id,
    format = 'single_elimination_third',
    bracket = coalesce(p_bracket, bracket),
    timeline = coalesce(p_timeline, timeline)
  where id = p_tournament_id
  returning * into v_tournament;

  return v_tournament;
end;
$$;

create or replace function public.save_tournament_progress(
  p_session_token text,
  p_tournament_id uuid,
  p_match_id uuid,
  p_bracket jsonb,
  p_timeline jsonb,
  p_status text,
  p_winner_id uuid default null,
  p_runner_up_id uuid default null,
  p_third_place_id uuid default null
)
returns public.tournaments
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_requester public.profiles;
  v_tournament public.tournaments;
  v_match jsonb;
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

  v_match := public.get_tournament_bracket_match(v_tournament.bracket, p_match_id);

  if v_match is null then
    raise exception 'Tournament match not found.';
  end if;

  if not coalesce(v_requester.is_root, false)
     and coalesce(v_match ->> 'player1Id', '') <> v_requester.id::text
     and coalesce(v_match ->> 'player2Id', '') <> v_requester.id::text then
    raise exception 'You are not allowed to update this tournament match.';
  end if;

  if p_status not in ('ongoing', 'completed') then
    raise exception 'Unsupported tournament status update.';
  end if;

  if jsonb_typeof(coalesce(p_bracket, '{}'::jsonb)) <> 'object' then
    raise exception 'A valid bracket payload is required.';
  end if;

  if jsonb_typeof(coalesce(p_timeline, '[]'::jsonb)) <> 'array' then
    raise exception 'A valid tournament timeline is required.';
  end if;

  update public.tournaments
  set
    status = p_status,
    bracket = p_bracket,
    timeline = p_timeline,
    winner_id = case when p_status = 'completed' then p_winner_id else winner_id end,
    runner_up_id = case when p_status = 'completed' then p_runner_up_id else runner_up_id end,
    third_place_id = case when p_status = 'completed' then p_third_place_id else third_place_id end,
    rewards_granted = case when p_status = 'completed' then false else rewards_granted end
  where id = p_tournament_id
  returning * into v_tournament;

  if p_status = 'completed' then
    v_tournament := public.award_tournament_rewards(v_tournament.id);
  end if;

  return v_tournament;
end;
$$;

create or replace function public.cancel_tournament(
  p_session_token text,
  p_tournament_id uuid
)
returns public.tournaments
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_requester public.profiles;
  v_tournament public.tournaments;
begin
  v_requester := public.current_profile_from_session(p_session_token, false);

  if not coalesce(v_requester.is_root, false) then
    raise exception 'Only the root admin can cancel a tournament.';
  end if;

  select *
  into v_tournament
  from public.tournaments
  where id = p_tournament_id
  for update;

  if v_tournament.id is null then
    raise exception 'Tournament not found.';
  end if;

  if v_tournament.status in ('completed', 'cancelled') then
    return v_tournament;
  end if;

  update public.tournaments
  set
    status = 'cancelled',
    timeline = public.append_tournament_event(
      timeline,
      jsonb_build_object(
        'id', extensions.gen_random_uuid()::text,
        'type', 'tournament_cancelled',
        'title', v_tournament.name || ' was cancelled',
        'description', 'The root admin closed this event before it finished.',
        'createdAt', timezone('utc', now()),
        'tournamentId', v_tournament.id,
        'matchId', null
      )
    )
  where id = p_tournament_id
  returning * into v_tournament;

  return v_tournament;
end;
$$;

create or replace function public.list_tournament_match_comments(
  p_session_token text,
  p_tournament_id uuid,
  p_match_id uuid
)
returns table (
  id uuid,
  tournament_id uuid,
  match_id uuid,
  user_id uuid,
  author_name text,
  author_avatar_url text,
  body text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_requester public.profiles;
  v_tournament public.tournaments;
  v_match jsonb;
begin
  v_requester := public.current_profile_from_session(p_session_token, false);

  select *
  into v_tournament
  from public.tournaments
  where id = p_tournament_id;

  if v_tournament.id is null then
    return;
  end if;

  v_match := public.get_tournament_bracket_match(v_tournament.bracket, p_match_id);

  if v_match is null then
    return;
  end if;

  if coalesce(v_match ->> 'status', '') not in ('completed', 'walkover') then
    return;
  end if;

  return query
  select
    c.id,
    c.tournament_id,
    c.match_id,
    c.user_id,
    p.display_name as author_name,
    p.avatar_url as author_avatar_url,
    c.body,
    c.created_at
  from public.tournament_match_comments c
  join public.profiles p on p.id = c.user_id
  where c.tournament_id = p_tournament_id
    and c.match_id = p_match_id
  order by c.created_at asc;
end;
$$;

create or replace function public.create_tournament_match_comment(
  p_session_token text,
  p_tournament_id uuid,
  p_match_id uuid,
  p_body text
)
returns table (
  id uuid,
  tournament_id uuid,
  match_id uuid,
  user_id uuid,
  author_name text,
  author_avatar_url text,
  body text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_requester public.profiles;
  v_tournament public.tournaments;
  v_match jsonb;
  v_comment_id uuid;
  v_body text := btrim(coalesce(p_body, ''));
begin
  v_requester := public.current_profile_from_session(p_session_token, false);

  if char_length(v_body) = 0 then
    raise exception 'Comment cannot be empty.';
  end if;

  if char_length(v_body) > 400 then
    raise exception 'Comment is too long.';
  end if;

  select *
  into v_tournament
  from public.tournaments
  where id = p_tournament_id;

  if v_tournament.id is null then
    raise exception 'Tournament not found.';
  end if;

  v_match := public.get_tournament_bracket_match(v_tournament.bracket, p_match_id);

  if v_match is null then
    raise exception 'Tournament match not found.';
  end if;

  if coalesce(v_match ->> 'status', '') not in ('completed', 'walkover') then
    raise exception 'Comments open after the match is finished.';
  end if;

  insert into public.tournament_match_comments (
    tournament_id,
    match_id,
    user_id,
    body
  )
  values (
    p_tournament_id,
    p_match_id,
    v_requester.id,
    v_body
  )
  returning id into v_comment_id;

  return query
  select
    c.id,
    c.tournament_id,
    c.match_id,
    c.user_id,
    v_requester.display_name as author_name,
    v_requester.avatar_url as author_avatar_url,
    c.body,
    c.created_at
  from public.tournament_match_comments c
  where c.id = v_comment_id;
end;
$$;

create or replace function public.admin_reset_user_progress(
  p_session_token text,
  p_user_id uuid
)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_requester public.profiles;
  v_target public.profiles;
begin
  v_requester := public.current_profile_from_session(p_session_token, false);

  if not coalesce(v_requester.is_root, false) then
    raise exception 'Only the root admin can reset user data.';
  end if;

  if p_user_id is null then
    raise exception 'Choose a user to reset.';
  end if;

  if p_user_id = v_requester.id then
    raise exception 'Reset your own root account manually if you really need to.';
  end if;

  select *
  into v_target
  from public.profiles
  where id = p_user_id
  for update;

  if v_target.id is null then
    raise exception 'User not found.';
  end if;

  if exists (
    select 1
    from public.tournaments
    where status = 'ongoing'
      and (
        p_user_id = any(participants)
        or winner_id = p_user_id
        or runner_up_id = p_user_id
        or third_place_id = p_user_id
        or admin_user_id = p_user_id
      )
  ) then
    raise exception 'Cannot reset a user who is still part of an ongoing tournament.';
  end if;

  delete from public.tournament_match_comments
  where user_id = p_user_id;

  delete from public.matches
  where player1_id = p_user_id
     or player2_id = p_user_id;

  update public.tournaments
  set
    participants = array_remove(participants, p_user_id),
    winner_id = case when status = 'registration' and winner_id = p_user_id then null else winner_id end,
    runner_up_id = case when status = 'registration' and runner_up_id = p_user_id then null else runner_up_id end,
    third_place_id = case when status = 'registration' and third_place_id = p_user_id then null else third_place_id end,
    admin_user_id = case when status = 'registration' and admin_user_id = p_user_id then null else admin_user_id end
  where status = 'registration'
    and (
      p_user_id = any(participants)
      or winner_id = p_user_id
      or runner_up_id = p_user_id
      or third_place_id = p_user_id
      or admin_user_id = p_user_id
    );

  update public.profiles
  set
    display_name = nickname,
    avatar_url = '',
    casual_stars = 0,
    casual_wins = 0,
    casual_losses = 0,
    ranked_points = 0,
    ranked_wins = 0,
    ranked_losses = 0,
    average_rank = 0,
    tournaments_played = 0,
    coins = 0,
    inventory = '{"trophies":[],"titles":["Novice Player"],"items":[]}'::jsonb,
    showcase = '[{"slotId":1,"trophyId":null},{"slotId":2,"trophyId":null},{"slotId":3,"trophyId":null}]'::jsonb,
    selected_title = 'Novice Player'
  where id = p_user_id
  returning * into v_target;

  update public.app_sessions
  set revoked_at = timezone('utc', now())
  where user_id = p_user_id
    and revoked_at is null;

  return v_target;
end;
$$;

create or replace function public.admin_delete_user(
  p_session_token text,
  p_user_id uuid
)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_requester public.profiles;
  v_target public.profiles;
begin
  v_requester := public.current_profile_from_session(p_session_token, false);

  if not coalesce(v_requester.is_root, false) then
    raise exception 'Only the root admin can delete users.';
  end if;

  if p_user_id is null then
    raise exception 'Choose a user to delete.';
  end if;

  if p_user_id = v_requester.id then
    raise exception 'Do not delete your own root account here.';
  end if;

  select *
  into v_target
  from public.profiles
  where id = p_user_id
  for update;

  if v_target.id is null then
    raise exception 'User not found.';
  end if;

  if coalesce(v_target.is_root, false) then
    raise exception 'Delete non-root test accounts only.';
  end if;

  if exists (
    select 1
    from public.tournaments
    where status = 'ongoing'
      and (
        p_user_id = any(participants)
        or winner_id = p_user_id
        or runner_up_id = p_user_id
        or third_place_id = p_user_id
        or admin_user_id = p_user_id
      )
  ) then
    raise exception 'Cannot delete a user who is still part of an ongoing tournament.';
  end if;

  update public.tournaments
  set participants = array_remove(participants, p_user_id)
  where p_user_id = any(participants);

  delete from public.profiles
  where id = p_user_id
  returning * into v_target;

  if v_target.id is null then
    raise exception 'User not found.';
  end if;

  perform public.ensure_system_tournament();

  return v_target;
end;
$$;
grant execute on function public.register_with_password(text, text) to anon, authenticated;
grant execute on function public.login_with_password(text, text) to anon, authenticated;
grant execute on function public.restore_password_session(text) to anon, authenticated;
grant execute on function public.logout_password_session(text) to anon, authenticated;
grant execute on function public.get_current_profile(text) to anon, authenticated;
grant execute on function public.get_player_profile(text, uuid) to anon, authenticated;
grant execute on function public.update_profile_preferences(text, text, text, text, jsonb) to anon, authenticated;
grant execute on function public.rename_profile_display_name(text, text) to anon, authenticated;
grant execute on function public.update_profile_identity(text, text, text, text) to anon, authenticated;
grant execute on function public.list_profiles_for_user(text, text, integer) to anon, authenticated;
grant execute on function public.list_leaderboard_profiles(text) to anon, authenticated;
grant execute on function public.list_shop_products_for_user(text) to anon, authenticated;
grant execute on function public.purchase_shop_item(text, text, integer) to anon, authenticated;
grant execute on function public.list_recent_matches_for_user(text, integer) to anon, authenticated;
grant execute on function public.list_active_casual_matches_for_user(text) to anon, authenticated;
grant execute on function public.get_match_for_user(text, uuid) to anon, authenticated;
grant execute on function public.create_match_request(text, uuid, text) to anon, authenticated;
grant execute on function public.change_match_status(text, uuid, text) to anon, authenticated;
grant execute on function public.submit_match_score(text, uuid, integer, integer) to anon, authenticated;
grant execute on function public.list_tournaments_for_user(text) to anon, authenticated;
grant execute on function public.register_for_tournament(text, uuid) to anon, authenticated;
grant execute on function public.end_tournament(text, uuid) to anon, authenticated;
grant execute on function public.create_tournament(text, text, text) to anon, authenticated;
grant execute on function public.start_tournament(text, uuid, jsonb, jsonb) to anon, authenticated;
grant execute on function public.save_tournament_progress(text, uuid, uuid, jsonb, jsonb, text, uuid, uuid, uuid) to anon, authenticated;
grant execute on function public.cancel_tournament(text, uuid) to anon, authenticated;
grant execute on function public.list_tournament_match_comments(text, uuid, uuid) to anon, authenticated;
grant execute on function public.create_tournament_match_comment(text, uuid, uuid, text) to anon, authenticated;
grant execute on function public.admin_reset_user_progress(text, uuid) to anon, authenticated;
grant execute on function public.admin_delete_user(text, uuid) to anon, authenticated;

select public.ensure_system_tournament();






