#!/bin/bash

# Add NEXT_PUBLIC_SUPABASE_URL
echo "Adding NEXT_PUBLIC_SUPABASE_URL..."
echo "https://calexrqhodjgxlojokbb.supabase.co" | npx vercel env add NEXT_PUBLIC_SUPABASE_URL production
echo "https://calexrqhodjgxlojokbb.supabase.co" | npx vercel env add NEXT_PUBLIC_SUPABASE_URL preview
echo "https://calexrqhodjgxlojokbb.supabase.co" | npx vercel env add NEXT_PUBLIC_SUPABASE_URL development

# Add NEXT_PUBLIC_SUPABASE_ANON_KEY
echo "Adding NEXT_PUBLIC_SUPABASE_ANON_KEY..."
echo "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNhbGV4cnFob2RqZ3hsb2pva2JiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA2MjMwNDEsImV4cCI6MjA3NjE5OTA0MX0.b7zkaCz7IQ53yeR7LgfMsPq3C6NHZi5Swr-PSMuN-is" | npx vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
echo "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNhbGV4cnFob2RqZ3hsb2pva2JiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA2MjMwNDEsImV4cCI6MjA3NjE5OTA0MX0.b7zkaCz7IQ53yeR7LgfMsPq3C6NHZi5Swr-PSMuN-is" | npx vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY preview
echo "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNhbGV4cnFob2RqZ3hsb2pva2JiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA2MjMwNDEsImV4cCI6MjA3NjE5OTA0MX0.b7zkaCz7IQ53yeR7LgfMsPq3C6NHZi5Swr-PSMuN-is" | npx vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY development

echo "Done! Now you need to add SUPABASE_SERVICE_ROLE_KEY manually."
echo "Get it from: https://supabase.com/dashboard/project/calexrqhodjgxlojokbb/settings/api"
