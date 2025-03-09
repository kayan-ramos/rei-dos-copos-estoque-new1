/*
  # User Management Schema

  1. New Tables
    - `user_roles`
      - `id` (uuid, primary key)
      - `name` (text, unique)
      - `created_at` (timestamptz)
    
    - `users`
      - `id` (uuid, primary key, references auth.users)
      - `email` (text, unique)
      - `full_name` (text)
      - `role_id` (uuid, references user_roles)
      - `must_change_password` (boolean)
      - `created_at` (timestamptz)
      - `last_login` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Add policies for role-based access
*/

-- Create user_roles table
CREATE TABLE IF NOT EXISTS user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY REFERENCES auth.users,
  email text UNIQUE NOT NULL,
  full_name text NOT NULL,
  role_id uuid REFERENCES user_roles NOT NULL,
  must_change_password boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  last_login timestamptz
);

-- Enable RLS
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Insert default roles
INSERT INTO user_roles (name) VALUES
  ('admin'),
  ('operator'),
  ('customer')
ON CONFLICT (name) DO NOTHING;

-- Create admin user
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'kayan.ramos@back2basics.com.br',
  crypt('DWS#123456', gen_salt('bf')),
  now(),
  now(),
  now()
) ON CONFLICT (email) DO NOTHING
RETURNING id;

-- Add admin user profile
WITH admin_user AS (
  SELECT id FROM auth.users WHERE email = 'kayan.ramos@back2basics.com.br'
),
admin_role AS (
  SELECT id FROM user_roles WHERE name = 'admin'
)
INSERT INTO users (id, email, full_name, role_id, must_change_password)
SELECT 
  admin_user.id,
  'kayan.ramos@back2basics.com.br',
  'Kayan Ramos',
  admin_role.id,
  true
FROM admin_user, admin_role
ON CONFLICT (id) DO NOTHING;

-- RLS Policies

-- user_roles policies
CREATE POLICY "Admins can manage roles"
  ON user_roles
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM user_roles r
      WHERE r.id = users.role_id
      AND r.name = 'admin'
    )
  ));

CREATE POLICY "Everyone can read roles"
  ON user_roles
  FOR SELECT
  TO authenticated
  USING (true);

-- users policies
CREATE POLICY "Admins can manage users"
  ON users
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM user_roles r
      WHERE r.id = u.role_id
      AND r.name = 'admin'
    )
  ));

CREATE POLICY "Users can read their own profile"
  ON users
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Users can update their own profile"
  ON users
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());