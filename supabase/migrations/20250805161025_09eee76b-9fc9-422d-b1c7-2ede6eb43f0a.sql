-- Update the handle_new_user function to require approval for clients as well
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  user_role public.app_role;
BEGIN
  -- Safely cast the role with a default fallback
  BEGIN
    user_role := COALESCE((NEW.raw_user_meta_data ->> 'role')::public.app_role, 'client'::public.app_role);
  EXCEPTION WHEN OTHERS THEN
    user_role := 'client'::public.app_role;
  END;
  
  INSERT INTO public.profiles (user_id, name, role, status, company_name, company_number, industry)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'name', NEW.email),
    user_role,
    CASE 
      WHEN user_role = 'admin'::public.app_role THEN 'approved'
      ELSE 'pending'
    END,
    NEW.raw_user_meta_data ->> 'company_name',
    NEW.raw_user_meta_data ->> 'company_number',
    NEW.raw_user_meta_data ->> 'industry'
  );
  RETURN NEW;
END;
$function$;