-- Delete the existing manually created admin user to fix auth issues
DELETE FROM auth.users WHERE email = 'admin@auditportal.com';

-- Delete the corresponding profile
DELETE FROM public.profiles WHERE name = 'System Administrator';