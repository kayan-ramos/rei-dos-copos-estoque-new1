/*
  # User Authentication and Roles Schema

  1. New Tables
    - `user_roles` - Defines available user roles
    - `users` - Extended user profile information
    - `password_resets` - Tracks password reset requirements
    
  2. Security
    - Enable RLS on all tables
    - Add policies for role-based access
*/

-- Create user roles enum
CREATE TYPE user_role AS ENUM ('admin', 'operator', 'customer');

-- Create user roles table
CREATE TABLE IF NOT EXISTS user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name user_role NOT NULL,
  description text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create extended user profiles table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY REFERENCES auth.users(id),
  email text UNIQUE NOT NULL,
  full_name text NOT NULL,
  role_id uuid REFERENCES user_roles(id),
  must_change_password boolean DEFAULT false,
  last_login timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create password resets table
CREATE TABLE IF NOT EXISTS password_resets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) NOT NULL,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours')
);

-- Enable RLS
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE password_resets ENABLE ROW LEVEL SECURITY;

-- Insert default roles
INSERT INTO user_roles (name, description) VALUES
  ('admin', 'Full system access'),
  ('operator', 'Operational access only'),
  ('customer', 'Customer access only');

-- Create master admin user
INSERT INTO users (id, email, full_name, role_id, must_change_password)
SELECT 
  id,
  'kayan.ramos@back2basics.com.br',
  'Kayan Ramos',
  (SELECT id FROM user_roles WHERE name = 'admin'),
  true
FROM auth.users
WHERE email = 'kayan.ramos@back2basics.com.br'
ON CONFLICT DO NOTHING;

-- Policies for user_roles
CREATE POLICY "Roles viewable by all authenticated users"
  ON user_roles FOR SELECT
  TO authenticated
  USING (true);

-- Policies for users
CREATE POLICY "Users can view their own profile"
  ON users FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all users"
  ON users FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      INNER JOIN user_roles r ON u.role_id = r.id
      WHERE u.id = auth.uid() AND r.name = 'admin'
    )
  );

CREATE POLICY "Admins can create users"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      INNER JOIN user_roles r ON u.role_id = r.id
      WHERE u.id = auth.uid() AND r.name = 'admin'
    )
  );

CREATE POLICY "Users can update their own profile"
  ON users FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Policies for password_resets
CREATE POLICY "Users can view their own password resets"
  ON password_resets FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create their own password resets"
  ON password_resets FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own password resets"
  ON password_resets FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());