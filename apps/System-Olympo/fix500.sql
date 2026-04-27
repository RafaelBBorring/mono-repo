-- Fix: Make handle_new_user() idempotent to prevent 500 on login
-- Run this in Supabase SQL Editor

-- 1. Fix the trigger function to handle existing profiles
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'role', 'user')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- 2. Ensure all existing auth.users have profiles (fills gaps)
insert into public.profiles (id, display_name, role)
select
  u.id,
  coalesce(u.raw_user_meta_data->>'display_name', split_part(u.email, '@', 1)),
  coalesce(u.raw_user_meta_data->>'role', 'user')
from auth.users u
on conflict (id) do nothing;

-- 3. Verify the fix
select 'profiles OK: ' || count(*) as status from public.profiles;
