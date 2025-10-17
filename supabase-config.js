// Supabase Configuration
// Replace these with your actual Supabase credentials from https://app.supabase.com

export const supabaseConfig = {
    url: process.env.SUPABASE_URL || 'YOUR_SUPABASE_URL_HERE',
    anonKey: process.env.SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY_HERE'
};

// To get your credentials:
// 1. Go to https://supabase.com
// 2. Create a free account
// 3. Create a new project
// 4. Go to Settings > API
// 5. Copy the "URL" and "anon public" key
