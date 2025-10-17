-- Verify Database Setup
-- Run this to check if everything is configured correctly

-- Check if tables exist
SELECT 'users table exists' as status, COUNT(*) as row_count FROM users;
SELECT 'admins table exists' as status, COUNT(*) as row_count FROM admins;
SELECT 'invite_codes table exists' as status, COUNT(*) as row_count FROM invite_codes;

-- Check if master admin exists
SELECT 'master admin status' as check_type,
       CASE WHEN EXISTS (SELECT 1 FROM admins WHERE username = 'master')
            THEN 'EXISTS'
            ELSE 'MISSING'
       END as status;

-- If master admin is missing, create it (this will only run if needed)
INSERT INTO admins (username, password, created_by)
SELECT 'master', 'PeePeePooPoo2020!', 'system'
WHERE NOT EXISTS (SELECT 1 FROM admins WHERE username = 'master');

-- If master user account is missing, create it
INSERT INTO users (username, password, invite_code, is_admin)
SELECT 'master', 'PeePeePooPoo2020!', 'ADMIN-AUTO', true
WHERE NOT EXISTS (SELECT 1 FROM users WHERE username = 'master');

-- Final verification
SELECT 'SETUP COMPLETE' as status;
SELECT * FROM admins WHERE username = 'master';
SELECT username, is_admin FROM users WHERE username = 'master';
