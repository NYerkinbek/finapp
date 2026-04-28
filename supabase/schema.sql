-- ─── Tables ───────────────────────────────────────────────────────────────────

create table if not exists spaces (
  id           uuid default gen_random_uuid() primary key,
  name         text not null,
  owner_id     uuid references auth.users(id),
  invite_code  text unique not null
               default upper(substring(md5(gen_random_uuid()::text), 1, 6)),
  created_at   timestamptz default now()
);

create table if not exists space_members (
  space_id  uuid references spaces(id) on delete cascade,
  user_id   uuid references auth.users(id),
  email     text,
  role      text not null default 'member',
  joined_at timestamptz default now(),
  primary key (space_id, user_id)
);

create table if not exists wallets (
  id         text primary key,
  space_id   uuid references spaces(id) on delete cascade,
  name       text not null,
  balance    numeric not null default 0,
  currency   text not null default '₸',
  color      text not null default '#6366f1',
  icon       text not null default 'wallet',
  created_at timestamptz default now()
);

create table if not exists categories (
  id       text primary key,
  space_id uuid references spaces(id) on delete cascade,
  name     text not null,
  icon     text not null,
  type     text not null check (type in ('income', 'expense')),
  color    text not null
);

create table if not exists transactions (
  id           text primary key,
  space_id     uuid references spaces(id) on delete cascade,
  wallet_id    text not null,
  to_wallet_id text,
  category_id  text,
  type         text not null check (type in ('income', 'expense', 'transfer')),
  amount       numeric not null,
  description  text not null default '',
  date         text not null,
  input_method text not null default 'manual',
  created_by   uuid references auth.users(id),
  created_at   timestamptz default now()
);

create table if not exists budgets (
  id          text primary key,
  space_id    uuid references spaces(id) on delete cascade,
  category_id text not null,
  amount      numeric not null,
  spent       numeric not null default 0,
  period      text not null,
  month       text not null
);

-- ─── Trigger: wallet balance ──────────────────────────────────────────────────

create or replace function fn_wallet_balance()
returns trigger language plpgsql security definer as $$
begin
  if tg_op = 'INSERT' then
    if new.type = 'income' then
      update wallets set balance = balance + new.amount where id = new.wallet_id;
    elsif new.type = 'expense' then
      update wallets set balance = balance - new.amount where id = new.wallet_id;
    elsif new.type = 'transfer' then
      update wallets set balance = balance - new.amount where id = new.wallet_id;
      if new.to_wallet_id is not null then
        update wallets set balance = balance + new.amount where id = new.to_wallet_id;
      end if;
    end if;

  elsif tg_op = 'DELETE' then
    if old.type = 'income' then
      update wallets set balance = balance - old.amount where id = old.wallet_id;
    elsif old.type = 'expense' then
      update wallets set balance = balance + old.amount where id = old.wallet_id;
    elsif old.type = 'transfer' then
      update wallets set balance = balance + old.amount where id = old.wallet_id;
      if old.to_wallet_id is not null then
        update wallets set balance = balance - old.amount where id = old.to_wallet_id;
      end if;
    end if;

  elsif tg_op = 'UPDATE' then
    -- reverse old
    if old.type = 'income' then
      update wallets set balance = balance - old.amount where id = old.wallet_id;
    elsif old.type = 'expense' then
      update wallets set balance = balance + old.amount where id = old.wallet_id;
    elsif old.type = 'transfer' then
      update wallets set balance = balance + old.amount where id = old.wallet_id;
      if old.to_wallet_id is not null then
        update wallets set balance = balance - old.amount where id = old.to_wallet_id;
      end if;
    end if;
    -- apply new
    if new.type = 'income' then
      update wallets set balance = balance + new.amount where id = new.wallet_id;
    elsif new.type = 'expense' then
      update wallets set balance = balance - new.amount where id = new.wallet_id;
    elsif new.type = 'transfer' then
      update wallets set balance = balance - new.amount where id = new.wallet_id;
      if new.to_wallet_id is not null then
        update wallets set balance = balance + new.amount where id = new.to_wallet_id;
      end if;
    end if;
  end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_wallet_balance on transactions;
create trigger trg_wallet_balance
  after insert or update or delete on transactions
  for each row execute function fn_wallet_balance();

-- ─── Trigger: budget spent ────────────────────────────────────────────────────

create or replace function fn_budget_spent()
returns trigger language plpgsql security definer as $$
begin
  if tg_op = 'INSERT' and new.type = 'expense' and new.category_id is not null then
    update budgets set spent = spent + new.amount
    where category_id = new.category_id and space_id = new.space_id;

  elsif tg_op = 'DELETE' and old.type = 'expense' and old.category_id is not null then
    update budgets set spent = greatest(0, spent - old.amount)
    where category_id = old.category_id and space_id = old.space_id;

  elsif tg_op = 'UPDATE' then
    if old.type = 'expense' and old.category_id is not null then
      update budgets set spent = greatest(0, spent - old.amount)
      where category_id = old.category_id and space_id = old.space_id;
    end if;
    if new.type = 'expense' and new.category_id is not null then
      update budgets set spent = spent + new.amount
      where category_id = new.category_id and space_id = new.space_id;
    end if;
  end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_budget_spent on transactions;
create trigger trg_budget_spent
  after insert or update or delete on transactions
  for each row execute function fn_budget_spent();

-- ─── Row Level Security ───────────────────────────────────────────────────────

alter table spaces         enable row level security;
alter table space_members  enable row level security;
alter table wallets        enable row level security;
alter table categories     enable row level security;
alter table transactions   enable row level security;
alter table budgets        enable row level security;

-- helper: spaces this user belongs to
create or replace function my_spaces()
returns setof uuid language sql security definer as $$
  select space_id from space_members where user_id = auth.uid();
$$;

create policy "spaces_select"  on spaces for select  using (id in (select my_spaces()));
create policy "spaces_insert"  on spaces for insert  with check (owner_id = auth.uid());
create policy "spaces_update"  on spaces for update  using (owner_id = auth.uid());

create policy "members_select" on space_members for select using (space_id in (select my_spaces()));
create policy "members_insert" on space_members for insert with check (user_id = auth.uid());
create policy "members_delete" on space_members for delete using (user_id = auth.uid());

create policy "wallets_all"      on wallets      for all using (space_id in (select my_spaces()));
create policy "categories_all"   on categories   for all using (space_id in (select my_spaces()));
create policy "transactions_all" on transactions  for all using (space_id in (select my_spaces()));
create policy "budgets_all"      on budgets       for all using (space_id in (select my_spaces()));
