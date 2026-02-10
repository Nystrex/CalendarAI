-- Create function to handle new user signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Insert profile
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', null)
  );

  -- Create default calendar
  insert into public.calendars (user_id, name, color, is_default)
  values (
    new.id,
    'My Calendar',
    '#3b82f6',
    true
  );

  return new;
end;
$$;

-- Drop existing trigger if exists
drop trigger if exists on_auth_user_created on auth.users;

-- Create trigger for new user signup
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();
