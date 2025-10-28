const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Verify that the user exists and the request includes valid user email
 * This prevents users from manipulating other users' accounts
 *
 * Since we're using OAuth (not Supabase auth), we validate by:
 * 1. Checking the userEmail matches the userId in the database
 * 2. Ensuring the user exists
 */
async function verifyUserOwnership(req, userId) {
  try {
    const { userEmail } = req.body;

    if (!userEmail) {
      return {
        authenticated: false,
        error: 'User email is required for authentication',
      };
    }

    // Get the user's record from the database
    const { data: userRecord, error: userError } = await supabase
      .from('users')
      .select('id, username')
      .eq('id', userId)
      .single();

    if (userError || !userRecord) {
      return {
        authenticated: false,
        error: 'User not found',
      };
    }

    // Verify the userEmail matches the database record
    if (userRecord.username !== userEmail) {
      return {
        authenticated: false,
        error: 'Unauthorized: Email mismatch',
      };
    }

    return {
      authenticated: true,
      user: userRecord,
    };
  } catch (error) {
    console.error('Authentication error:', error);
    return {
      authenticated: false,
      error: 'Authentication failed',
    };
  }
}

module.exports = {
  verifyUserOwnership,
};
