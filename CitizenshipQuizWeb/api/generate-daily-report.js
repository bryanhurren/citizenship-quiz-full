const { createClient } = require('@supabase/supabase-js');
const sgMail = require('@sendgrid/mail');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

module.exports = async (req, res) => {
  // Verify secret
  if (req.query.secret !== 'temp-fix-2025') {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Calculate date range (yesterday 00:00 to today 00:00)
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const todayISO = today.toISOString();
    const yesterdayISO = yesterday.toISOString();
    const dateString = yesterday.toISOString().split('T')[0];

    // Collect metrics for yesterday
    console.log(`Collecting metrics for ${dateString}`);

    // 1. New users
    const { data: newUsers, error: newUsersError } = await supabase
      .from('users')
      .select('id')
      .gte('created_at', yesterdayISO)
      .lt('created_at', todayISO);

    if (newUsersError) throw newUsersError;

    // 2. Total users
    const { count: totalUsersCount, error: totalUsersError } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });

    if (totalUsersError) throw totalUsersError;

    // 3. Active users (logged in yesterday)
    const { data: activeUsers, error: activeUsersError } = await supabase
      .from('users')
      .select('id')
      .gte('last_session_date', yesterdayISO)
      .lt('last_session_date', todayISO);

    if (activeUsersError) throw activeUsersError;

    // 4. New subscriptions (started yesterday)
    const { data: newSubscriptions, error: newSubsError } = await supabase
      .from('users')
      .select('id, subscription_expires_at')
      .eq('subscription_tier', 'premium')
      .gte('created_at', yesterdayISO)
      .lt('created_at', todayISO);

    if (newSubsError) throw newSubsError;

    // 5. Active subscriptions (currently active)
    const { data: activeSubscriptions, error: activeSubsError } = await supabase
      .from('users')
      .select('id')
      .eq('subscription_tier', 'premium')
      .gt('subscription_expires_at', todayISO);

    if (activeSubsError) throw activeSubsError;

    // 6. Revenue (simple calculation: $0.99 per new subscription)
    const revenue = (newSubscriptions?.length || 0) * 0.99;

    // Store metrics in database
    const metrics = {
      date: dateString,
      new_users: newUsers?.length || 0,
      total_users: totalUsersCount || 0,
      active_users: activeUsers?.length || 0,
      new_subscriptions: newSubscriptions?.length || 0,
      active_subscriptions: activeSubscriptions?.length || 0,
      revenue_usd: revenue,
    };

    console.log('Metrics collected:', metrics);

    // Insert or update metrics in daily_metrics table
    const { error: metricsError } = await supabase
      .from('daily_metrics')
      .upsert(metrics, { onConflict: 'date' });

    if (metricsError) {
      console.error('Error storing metrics:', metricsError);
      // Continue anyway - we'll still send the email
    }

    // Get admin emails
    const { data: admins, error: adminsError } = await supabase
      .from('admin_users')
      .select('email')
      .eq('receive_daily_reports', true)
      .not('email', 'is', null);

    if (adminsError) {
      console.error('Error fetching admin emails:', adminsError);
    }

    const recipientEmails = admins?.map(a => a.email).filter(Boolean) || [];

    // Fallback to ADMIN_EMAIL env var if no admins configured
    if (recipientEmails.length === 0 && process.env.ADMIN_EMAIL) {
      recipientEmails.push(process.env.ADMIN_EMAIL);
    }

    if (recipientEmails.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'Metrics collected but no recipients configured',
        metrics
      });
    }

    // Send email if SendGrid is configured
    if (!process.env.SENDGRID_API_KEY) {
      return res.status(200).json({
        success: true,
        message: 'Metrics collected but SendGrid not configured',
        metrics,
        recipients: recipientEmails
      });
    }

    sgMail.setApiKey(process.env.SENDGRID_API_KEY);

    // Generate HTML email
    const emailHTML = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background-color: #f5f5f5;
      padding: 20px;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: white;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
    }
    .header p {
      margin: 5px 0 0 0;
      opacity: 0.9;
    }
    .metrics {
      padding: 30px;
    }
    .metric-row {
      display: flex;
      justify-content: space-between;
      padding: 15px 0;
      border-bottom: 1px solid #eee;
    }
    .metric-row:last-child {
      border-bottom: none;
    }
    .metric-label {
      color: #666;
      font-weight: 500;
    }
    .metric-value {
      font-size: 20px;
      font-weight: 600;
      color: #333;
    }
    .metric-value.positive {
      color: #10b981;
    }
    .metric-value.revenue {
      color: #8b5cf6;
    }
    .footer {
      background-color: #f9fafb;
      padding: 20px;
      text-align: center;
      color: #666;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📊 Daily Report</h1>
      <p>${dateString}</p>
    </div>
    <div class="metrics">
      <div class="metric-row">
        <span class="metric-label">New Users</span>
        <span class="metric-value ${metrics.new_users > 0 ? 'positive' : ''}">${metrics.new_users}</span>
      </div>
      <div class="metric-row">
        <span class="metric-label">Total Users</span>
        <span class="metric-value">${metrics.total_users}</span>
      </div>
      <div class="metric-row">
        <span class="metric-label">Active Users</span>
        <span class="metric-value">${metrics.active_users}</span>
      </div>
      <div class="metric-row">
        <span class="metric-label">New Subscriptions</span>
        <span class="metric-value ${metrics.new_subscriptions > 0 ? 'positive' : ''}">${metrics.new_subscriptions}</span>
      </div>
      <div class="metric-row">
        <span class="metric-label">Active Subscriptions</span>
        <span class="metric-value">${metrics.active_subscriptions}</span>
      </div>
      <div class="metric-row">
        <span class="metric-label">Revenue</span>
        <span class="metric-value revenue">$${metrics.revenue_usd.toFixed(2)}</span>
      </div>
    </div>
    <div class="footer">
      <p>CitizenshipQuiz App · Daily Automated Report</p>
      <p>Generated at ${new Date().toISOString()}</p>
    </div>
  </div>
</body>
</html>
    `.trim();

    const msg = {
      to: recipientEmails,
      from: process.env.SENDGRID_FROM_EMAIL || 'reports@theeclodapps.com',
      subject: `📊 Daily Report - ${dateString}`,
      html: emailHTML,
    };

    await sgMail.send(msg);

    console.log(`Daily report sent to: ${recipientEmails.join(', ')}`);

    return res.status(200).json({
      success: true,
      message: 'Daily report generated and sent',
      metrics,
      recipients: recipientEmails
    });

  } catch (error) {
    console.error('Error generating daily report:', error);
    return res.status(500).json({
      error: 'Failed to generate daily report',
      details: error.message
    });
  }
};
