const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://fpnvdivpopwxytbyhxpz.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZwbnZkaXZwb3B3eHl0YnloeHB6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU0Mjg3NjAsImV4cCI6MjA1MTAwNDc2MH0.vnR6R9O7pGwBW5vDHqJnAkSsB5XFlWnqAO-r3eQLa-c';

const supabase = createClient(supabaseUrl, supabaseKey);

async function clearSession() {
  try {
    // Get all users with active sessions
    const { data: users, error: fetchError } = await supabase
      .from('users')
      .select('username, session_status')
      .not('session_status', 'is', null);

    if (fetchError) {
      console.error('Error fetching users:', fetchError);
      return;
    }

    console.log(`Found ${users?.length || 0} users with active sessions`);

    // Update all users to clear session_status
    const { data, error } = await supabase
      .from('users')
      .update({
        session_status: null,
        current_question: 0,
        correct_count: 0,
        partial_count: 0,
        incorrect_count: 0,
        question_results: [],
        shuffled_question_indices: [],
        completed: false
      })
      .not('session_status', 'is', null)
      .select();

    if (error) {
      console.error('Error clearing sessions:', error);
    } else {
      console.log('Successfully cleared all active sessions');
      console.log('Cleared sessions for:', data?.map(u => u.username).join(', '));
    }
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

clearSession();
