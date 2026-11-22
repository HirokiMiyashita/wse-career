-- メンバー（従業員・アーティスト）と招待
--
-- 流れ
--   1. 最初に新規登録した人が管理者（従業員）になる
--   2. 以降は招待制。管理者が「従業員／アーティスト」を選んで招待する
--   3. 招待された人がメールのリンクから表示名・パスワードを設定すると有効になる
--   タスクの担当に割り当てられるのは従業員だけ（アーティストは割り当て不可）

create type public.member_kind as enum ('employee', 'artist');
create type public.member_status as enum ('invited', 'active', 'disabled');
create type public.invitation_status as enum ('pending', 'accepted', 'revoked');

create table public.members (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  display_name text not null default '',
  kind public.member_kind not null,
  is_admin boolean not null default false,
  -- アーティストとして招待した場合の紐づけ先（アーティストのデータは未テーブル化のため ID の文字列）
  artist_id text,
  status public.member_status not null default 'invited',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint members_artist_link check ((kind = 'artist') = (artist_id is not null)),
  constraint members_admin_is_employee check (not is_admin or kind = 'employee')
);
create unique index members_email_key on public.members (lower(email));

create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  kind public.member_kind not null,
  artist_id text,
  invited_by uuid references public.members (id) on delete set null,
  -- 招待メール送信時に作られたユーザー
  member_id uuid references public.members (id) on delete set null,
  status public.invitation_status not null default 'pending',
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  constraint invitations_artist_link check ((kind = 'artist') = (artist_id is not null))
);
-- 同じメールアドレスへの未完了の招待は1件まで
create unique index invitations_pending_email_key on public.invitations (lower(email)) where status = 'pending';

/* ---------- 権限の判定 ---------- */

create function public.is_member()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.members where id = auth.uid() and status <> 'disabled'
  );
$$;

create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.members where id = auth.uid() and is_admin and status <> 'disabled'
  );
$$;

/* ---------- ユーザー作成時：最初の1人は管理者、以降は招待がある人だけ ---------- */

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  inv public.invitations;
begin
  -- 同時に「最初の1人」が2人生まれないようにする
  lock table public.members in share row exclusive mode;

  if not exists (select 1 from public.members) then
    insert into public.members (id, email, kind, is_admin, status)
    values (new.id, new.email, 'employee', true, 'active');
    return new;
  end if;

  select * into inv
  from public.invitations
  where lower(email) = lower(new.email) and status = 'pending'
  order by created_at desc
  limit 1;

  if inv.id is null then
    raise exception 'invite_only' using hint = '招待されたメールアドレスのみ登録できます';
  end if;

  insert into public.members (id, email, kind, artist_id, status)
  values (new.id, new.email, inv.kind, inv.artist_id, 'invited');

  update public.invitations set member_id = new.id where id = inv.id;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

/* ---------- 招待を受けた人の初回設定 ---------- */

create function public.complete_onboarding(p_display_name text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;
  if coalesce(trim(p_display_name), '') = '' then
    raise exception 'display_name_required';
  end if;

  update public.members
  set display_name = trim(p_display_name),
      status = case when status = 'invited' then 'active'::public.member_status else status end,
      updated_at = now()
  where id = auth.uid();

  update public.invitations
  set status = 'accepted', accepted_at = now()
  where member_id = auth.uid() and status = 'pending';
end;
$$;

/* ---------- 新規登録画面を出すか（管理者がまだいないときだけ） ---------- */

create function public.signup_open()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select not exists (select 1 from public.members);
$$;

revoke execute on function public.is_member() from public, anon;
revoke execute on function public.is_admin() from public, anon;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.complete_onboarding(text) from public, anon;
grant execute on function public.is_member() to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.complete_onboarding(text) to authenticated;
grant execute on function public.signup_open() to anon, authenticated;

/* ---------- RLS ---------- */

-- テーブル権限（行の絞り込みは下の RLS で行う）
revoke all on public.members from anon, authenticated;
revoke all on public.invitations from anon, authenticated;
grant select, update on public.members to authenticated;
grant select, insert, update, delete on public.invitations to authenticated;

alter table public.members enable row level security;
alter table public.invitations enable row level security;

create policy "メンバーは全員の一覧を見られる"
  on public.members for select to authenticated
  using (public.is_member());

create policy "管理者はメンバーを更新できる"
  on public.members for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "管理者は招待を見られる"
  on public.invitations for select to authenticated
  using (public.is_admin());

create policy "管理者は招待を作れる"
  on public.invitations for insert to authenticated
  with check (public.is_admin() and invited_by = auth.uid());

create policy "管理者は招待を更新できる"
  on public.invitations for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "管理者は送信に失敗した招待を消せる"
  on public.invitations for delete to authenticated
  using (public.is_admin() and status = 'pending' and member_id is null);

/* ---------- 既存ユーザーの移行：いちばん古いユーザーを管理者、ほかは従業員にする ---------- */

insert into public.members (id, email, kind, is_admin, status)
select
  u.id,
  u.email,
  'employee',
  row_number() over (order by u.created_at) = 1,
  'active'
from auth.users u
where u.email is not null;
