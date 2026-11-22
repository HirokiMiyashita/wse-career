-- 業務データ（アーティスト・企画・判断待ち・楽曲・案件・ナレッジ）
--
-- アーティストと企画は、画面の単位（キャリアプラン／企画の中身）でまとめて読み書きするため、
-- 中身を jsonb で持つ。形は src/lib/domain/types.ts の Artist.plan / Project と同じ。
-- 同時編集で上書きし合わないよう version を持ち、更新時に一致を確認する（楽観ロック）。
-- 利用できるのはメンバー（public.is_member()）だけ。

create table public.artists (
  id text primary key,
  name text not null,
  role text not null default '',
  color text not null,
  plan jsonb not null,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.projects (
  id text primary key,
  artist_id text not null references public.artists (id) on delete cascade,
  -- Project から id・artistId を除いた中身
  data jsonb not null,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index projects_artist_id_idx on public.projects (artist_id);

create table public.approvals (
  id text primary key,
  kind text not null check (kind in ('change', 'task', 'deal', 'plan', 'project')),
  project_id text references public.projects (id) on delete cascade,
  artist_id text not null references public.artists (id) on delete cascade,
  ref text not null default '',
  title text not null,
  reason text not null default '',
  due date not null,
  ws boolean not null default false,
  artist boolean not null default false,
  created_at timestamptz not null default now()
);
create index approvals_artist_id_idx on public.approvals (artist_id);

create table public.songs (
  id uuid primary key default gen_random_uuid(),
  artist_id text not null references public.artists (id) on delete cascade,
  no text not null,
  title text not null,
  beat text not null default '',
  stage integer not null default 0,
  -- [独占利用, 著作権, 原盤, 印税分配] それぞれ ok / ng / na
  rights jsonb not null default '["ng","ng","ng","ng"]',
  memo text not null default '',
  sort integer not null default 0
);
create index songs_artist_id_idx on public.songs (artist_id);

create table public.deals (
  id text primary key,
  artist_id text not null references public.artists (id) on delete cascade,
  title text not null,
  stage integer not null default 0,
  date date not null,
  fee text not null default '',
  next text not null default '',
  sensitive boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.knowledge (
  id uuid primary key default gen_random_uuid(),
  project_id text references public.projects (id) on delete set null,
  artist_id text not null references public.artists (id) on delete cascade,
  title text not null,
  date text not null,
  -- [[ラベル, 値], ...]
  metrics jsonb not null default '[]',
  learning text not null default '',
  created_at timestamptz not null default now()
);

/* ---------- 権限：メンバーだけが読み書きできる ---------- */

do $$
declare
  t text;
begin
  foreach t in array array['artists', 'projects', 'approvals', 'songs', 'deals', 'knowledge'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('create policy "メンバーは読める" on public.%I for select to authenticated using (public.is_member())', t);
    execute format('create policy "メンバーは追加できる" on public.%I for insert to authenticated with check (public.is_member())', t);
    execute format('create policy "メンバーは更新できる" on public.%I for update to authenticated using (public.is_member()) with check (public.is_member())', t);
    execute format('create policy "メンバーは削除できる" on public.%I for delete to authenticated using (public.is_member())', t);
  end loop;
end;
$$;
