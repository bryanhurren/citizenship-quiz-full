const { createClient } = require('@supabase/supabase-js');
const sgMail = require('@sendgrid/mail');
const { initSentry, captureException } = require('./lib/sentry');

// Initialize Sentry
initSentry();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Initialize SendGrid
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

module.exports = async (req, res) => {
  // Simple secret-based auth for cron job
  const { secret } = req.query;

  if (secret !== 'temp-fix-2025') {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    console.log('📊 Generating daily report...');

    // Get yesterday's date range
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    const today = new Date(yesterday);
    today.setDate(today.getDate() + 1);

    const yesterdayISO = yesterday.toISOString();
    const todayISO = today.toISOString();

    // Fetch metrics

    // 1. New users
    const { data: newUsers, error: newUsersError } = await supabase
      .from('users')
      .select('id')
      .gte('created_at', yesterdayISO)
      .lt('created_at', todayISO);

    // 2. Total users
    const { count: totalUsers, error: totalUsersError } = await supabase
      .from('users')
      .select('id', { count: 'exact', head: true });

    // 3. New subscriptions (users who became premium yesterday)
    const { data: newSubscriptions, error: newSubscriptionsError } = await supabase
      .from('users')
      .select('id, stripe_subscription_id')
      .eq('subscription_tier', 'premium')
      .gte('created_at', yesterdayISO)
      .lt('created_at', todayISO);

    // 4. Active subscriptions (premium users with future expiration)
    const { data: activeSubscriptions, error: activeSubscriptionsError } = await supabase
      .from('users')
      .select('id')
      .eq('subscription_tier', 'premium')
      .gte('subscription_expires_at', now.toISOString());

    // 5. Revenue calculation (assume $0.99 per subscription)
    const revenue = (newSubscriptions?.length || 0) * 0.99;

    const metrics = {
      date: yesterday.toISOString().split('T')[0],
      new_users: newUsers?.length || 0,
      total_users: totalUsers || 0,
      new_subscriptions: newSubscriptions?.length || 0,
      active_subscriptions: activeSubscriptions?.length || 0,
      revenue_usd: revenue.toFixed(2),
    };

    console.log('Metrics collected:', metrics);

    // Store metrics in database
    const { data: insertedMetric, error: insertError } = await supabase
      .from('daily_metrics')
      .insert([{
        date: metrics.date,
        new_users: metrics.new_users,
        total_users: metrics.total_users,
        new_subscriptions: metrics.new_subscriptions,
        active_subscriptions: metrics.active_subscriptions,
        revenue_usd: metrics.revenue_usd,
      }])
      .select();

    if (insertError) {
      console.error('Error storing metrics:', insertError);
      // Continue anyway - we'll still send the email
    }

    // Generate HTML email
    const emailHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #667eea; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
          .metrics { background: #f5f5f5; padding: 20px; }
          .metric-card { background: white; padding: 15px; margin: 10px 0; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
          .metric-value { font-size: 32px; font-weight: bold; color: #667eea; }
          .metric-label { font-size: 14px; color: #666; text-transform: uppercase; }
          .footer { padding: 20px; text-align: center; color: #999; font-size: 12px; }
          .positive { color: #4caf50; }
          .warning { color: #ff9800; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📊 Daily Operations Report</h1>
            <p>Date: ${metrics.date}</p>
          </div>

          <div class="metrics">
            <div class="metric-card">
              <div class="metric-value">${metrics.new_users}</div>
              <div class="metric-label">New Users</div>
            </div>

            <div class="metric-card">
              <div class="metric-value">${metrics.total_users}</div>
              <div class="metric-label">Total Users</div>
            </div>

            <div class="metric-card">
              <div class="metric-value ${metrics.new_subscriptions > 0 ? 'positive' : ''}">${metrics.new_subscriptions}</div>
              <div class="metric-label">New Subscriptions</div>
            </div>

            <div class="metric-card">
              <div class="metric-value">${metrics.active_subscriptions}</div>
              <div class="metric-label">Active Subscriptions</div>
            </div>

            <div class="metric-card">
              <div class="metric-value positive">$${metrics.revenue_usd}</div>
              <div class="metric-label">Revenue</div>
            </div>
          </div>

          <div class="footer">
            <p>Generated automatically by CitizenshipQuiz Daily Report System</p>
            <p><a href="https://www.theeclodapps.com/admin.html">View Admin Dashboard</a></p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Get admin emails
    const { data: admins, error: adminsError } = await supabase
      .from('admin_users')
      .select('email, receive_daily_reports')
      .eq('receive_daily_reports', true)
      .not('email', 'is', null);

    if (adminsError) {
      console.error('Error fetching admin emails:', adminsError);
    }

    const recipientEmails = admins?.map(admin => admin.email).filter(Boolean) || [];

    // If no admins set up yet, send to environment variable fallback
    if (recipientEmails.length === 0 && process.env.ADMIN_EMAIL) {
      recipientEmails.push(process.env.ADMIN_EMAIL);
    }

    console.log(`Sending report to ${recipientEmails.length} recipient(s)`);

    // Send email
    if (!process.env.SENDGRID_API_KEY) {
      console.log('⚠️ SENDGRID_API_KEY not configured - email not sent');
      return res.json({
        success: true,
        message: 'Report generated but email not sent (SendGrid not configured)',
        metrics,
        recipients: recipientEmails,
        emailHTML: emailHTML,
      });
    }

    if (recipientEmails.length === 0) {
      console.log('⚠️ No recipients configured');
      return res.json({
        success: true,
        message: 'Report generated but no recipients configured',
        metrics,
      });
    }

    const msg = {
      to: recipientEmails,
      from: process.env.SENDGRID_FROM_EMAIL || 'reports@theeclodapps.com',
      subject: `📊 Daily Report - ${metrics.date}`,
      html: emailHTML,
    };

    try {
      await sgMail.send(msg);
      console.log('✅ Email sent successfully');

      return res.json({
        success: true,
        message: 'Daily report generated and sent',
        metrics,
        recipients: recipientEmails.length,
      });
    } catch (emailError) {
      console.error('Error sending email:', emailError);
      captureException(emailError, { metrics, recipients: recipientEmails });

      return res.status(500).json({
        success: false,
        error: 'Failed to send email',
        message: emailError.message,
        metrics,
      });
    }

  } catch (error) {
    console.error('❌ Error generating daily report:', error);
    captureException(error);

    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message,
    });
  }
};
