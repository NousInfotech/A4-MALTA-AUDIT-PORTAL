-- Instead of manually creating auth user, let's create a way to promote any user to admin
-- First, let's create a temporary admin promotion function

CREATE OR REPLACE FUNCTION public.promote_user_to_admin(user_email text)
RETURNS boolean AS $$
BEGIN
  UPDATE public.profiles 
  SET role = 'admin', status = 'approved'
  WHERE user_id IN (
    SELECT id FROM auth.users WHERE email = user_email
  );
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;