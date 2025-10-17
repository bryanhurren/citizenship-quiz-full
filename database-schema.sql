-- Supabase Database Schema for US Citizenship Quiz
-- Run this in your Supabase SQL Editor (https://app.supabase.com -> SQL Editor)

-- Users Table
CREATE TABLE users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    invite_code TEXT NOT NULL,
    current_question INTEGER DEFAULT 0,
    correct_count INTEGER DEFAULT 0,
    partial_count INTEGER DEFAULT 0,
    incorrect_count INTEGER DEFAULT 0,
    question_results JSONB DEFAULT '[]'::jsonb,
    completed BOOLEAN DEFAULT false,
    api_provider TEXT DEFAULT '',
    api_key TEXT DEFAULT '',
    best_score INTEGER DEFAULT 0,
    last_session_date TIMESTAMPTZ,
    is_admin BOOLEAN DEFAULT false,
    mode TEXT DEFAULT 'formal',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Admins Table
CREATE TABLE admins (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT
);

-- Invite Codes Table
CREATE TABLE invite_codes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    used BOOLEAN DEFAULT false,
    used_by TEXT,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT NOT NULL
);

-- Create indexes for better performance
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_best_score ON users(best_score DESC);
CREATE INDEX idx_invite_codes_code ON invite_codes(code);
CREATE INDEX idx_invite_codes_used ON invite_codes(used);

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE invite_codes ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Allow all operations for now (you can make this more restrictive later)
CREATE POLICY "Allow all operations on users" ON users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on admins" ON admins FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on invite_codes" ON invite_codes FOR ALL USING (true) WITH CHECK (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to auto-update updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert master admin
INSERT INTO admins (username, password, created_by)
VALUES ('master', 'PeePeePooPoo2020!', 'system');

-- Insert master admin as user
INSERT INTO users (username, password, invite_code, is_admin)
VALUES ('master', 'PeePeePooPoo2020!', 'ADMIN-AUTO', true);
