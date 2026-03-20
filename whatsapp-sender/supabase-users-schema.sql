-- Users table for application authentication
-- Execute this in your Supabase SQL Editor

-- Users table
CREATE TABLE IF NOT EXISTS app_users (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_app_users_email ON app_users(email);
CREATE INDEX IF NOT EXISTS idx_app_users_role ON app_users(role);

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS update_app_users_updated_at ON app_users;
CREATE TRIGGER update_app_users_updated_at
  BEFORE UPDATE ON app_users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;

-- Policy to allow all operations (for app-level auth, not Supabase auth)
CREATE POLICY "Allow all operations on app_users" ON app_users
  FOR ALL USING (true) WITH CHECK (true);

-- Insert the first admin user
-- Email: pedro.borges@agirsaude.org.br
-- Password: Agir@123 (SHA-256 hashed)
INSERT INTO app_users (email, password_hash, name, role)
VALUES (
  'pedro.borges@agirsaude.org.br',
  '85EC8AA6D0A5E931567976C7A3A337A17FB9CA64AEA0E114DF74F3C68D040523',
  'Pedro Borges',
  'admin'
) ON CONFLICT (email) DO NOTHING;
