-- Create admin user with minimal required fields to avoid confirmation_token issues
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  confirmation_token,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmed_at
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'admin@auditportal.com',
  crypt('admin123', gen_salt('bf')),
  NOW(),
  '',
  '{"provider": "email", "providers": ["email"]}',
  '{"name": "System Administrator", "role": "admin"}',
  NOW(),
  NOW(),
  NOW()
);