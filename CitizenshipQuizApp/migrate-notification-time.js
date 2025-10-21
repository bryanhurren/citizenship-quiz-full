// Migration script to add notification_time column
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://calexrqhodjgxlojokbb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNhbGV4cnFob2RqZ3hsb2pva2JiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA2MjMwNDEsImV4cCI6MjA3NjE5OTA0MX0.b7zkaCz7IQ53yeR7LgfMsPq3C6NHZi5Swr-PSMuN-is';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function migrate() {
  console.log('Starting migration: Adding notification_time column...');

  try {
    // Note: The anon key might not have permissions to ALTER TABLE
    // This will attempt the migration, but if it fails, you'll need to run it via Supabase SQL Editor
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE users ADD COLUMN IF NOT EXISTS notification_time VARCHAR(5) DEFAULT '09:00';
        UPDATE users SET notification_time = '09:00' WHERE notification_time IS NULL;
      `
    });

    if (error) {
      console.error('Migration failed:', error.message);
      console.log('\nThe anon key does not have permissions to ALTER TABLE.');
      console.log('Please run this SQL in your Supabase SQL Editor:\n');
      console.log('ALTER TABLE users ADD COLUMN IF NOT EXISTS notification_time VARCHAR(5) DEFAULT \'09:00\';');
      console.log('UPDATE users SET notification_time = \'09:00\' WHERE notification_time IS NULL;');
      process.exit(1);
    }

    console.log('Migration completed successfully!');
    console.log('notification_time column added to users table');
  } catch (error) {
    console.error('Error during migration:', error);
    console.log('\nPlease run this SQL in your Supabase SQL Editor:\n');
    console.log('ALTER TABLE users ADD COLUMN IF NOT EXISTS notification_time VARCHAR(5) DEFAULT \'09:00\';');
    console.log('UPDATE users SET notification_time = \'09:00\' WHERE notification_time IS NULL;');
    process.exit(1);
  }
}

migrate();
