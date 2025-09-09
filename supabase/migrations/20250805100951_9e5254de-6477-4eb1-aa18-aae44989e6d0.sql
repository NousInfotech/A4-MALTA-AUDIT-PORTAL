-- Fix the trigger function to properly handle the app_role type
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_role public.app_role;
BEGIN
  -- Safely cast the role with a default fallback
  BEGIN
    user_role := COALESCE((NEW.raw_user_meta_data ->> 'role')::public.app_role, 'client'::public.app_role);
  EXCEPTION WHEN OTHERS THEN
    user_role := 'client'::public.app_role;
  END;
  
  INSERT INTO public.profiles (user_id, name, role, status)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'name', NEW.email),
    user_role,
    CASE 
      WHEN user_role = 'employee'::public.app_role THEN 'pending'
      ELSE 'approved'
    END
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';