-- Update function to handle new user signup with university data
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Insert profile with university data from user metadata
  insert into public.profiles (id, email, full_name, university, university_verified, phone_number)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', null),
    coalesce(new.raw_user_meta_data ->> 'university', null),
    coalesce((new.raw_user_meta_data ->> 'university_verified')::boolean, false),
    coalesce(new.raw_user_meta_data ->> 'phone_number', null)
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
