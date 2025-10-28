# Admin System Migration to Supabase - Implementation Plan

## Overview
Migrating admin management from localStorage to Supabase database with email support and notification preferences.

## Step 1: Run SQL Migration

**Action**: You need to run this SQL in Supabase SQL Editor:

```sql
-- Create admin_users table
CREATE TABLE IF NOT EXISTS admin_users (
    id SERIAL PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    email TEXT,
    receive_alerts BOOLEAN DEFAULT false,
    receive_daily_reports BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    created_by TEXT
);

-- Add index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_admin_users_email ON admin_users(email);

-- Add index on username for faster login lookups
CREATE INDEX IF NOT EXISTS idx_admin_users_username ON admin_users(username);

-- Insert master admin (migrate from localStorage)
-- Use your actual master admin password
INSERT INTO admin_users (username, password, email, receive_alerts, receive_daily_reports, created_at)
VALUES ('master', 'PeePeePooPoo2020!', NULL, false, false, NOW())
ON CONFLICT (username) DO NOTHING;
```

## Step 2: Update admin.html JavaScript

### Changes Needed:

1. **Remove localStorage admin management**
   - Delete `initAdminSystem()` function
   - Delete localStorage reads/writes for admins

2. **Add Supabase admin functions**
   - `loadAdminsFromDB()` - Load from admin_users table
   - `createAdminInDB()` - Insert into admin_users table
   - `updateAdminInDB()` - Update email/preferences
   - `loginAdminFromDB()` - Check credentials against database

3. **Add email field to Create Admin form**
   - Add email input field (required for new admins)
   - Add checkboxes for receive_alerts and receive_daily_reports

4. **Add Edit Admin functionality**
   - New "Edit" button for each admin in the list
   - Modal/form to update:
     - Email address
     - Receive alerts checkbox
     - Receive daily reports checkbox
     - Password (optional)

5. **Update Login Logic**
   - Query `admin_users` table instead of localStorage
   - Support login with username OR email + password

## Step 3: Backward Compatibility

**Handle existing localStorage admins**:
- On first load, check if localStorage has admins
- If yes, show migration prompt
- Button: "Migrate Admins to Database"
- Copies all localStorage admins to Supabase
- Clears localStorage after successful migration

## Step 4: Admin UI Changes

### Create Admin Section (Enhanced)
```html
<h2>Create New Admin</h2>
<div class="form-group">
    <label for="newAdminUsername">Username:</label>
    <input type="text" id="newAdminUsername" required>
</div>
<div class="form-group">
    <label for="newAdminEmail">Email: <span style="color: red;">*</span></label>
    <input type="email" id="newAdminEmail" required>
</div>
<div class="form-group">
    <label for="newAdminPassword">Password:</label>
    <input type="password" id="newAdminPassword" required>
</div>
<div class="form-group">
    <label>
        <input type="checkbox" id="newAdminAlerts"> Receive Alert Emails
    </label>
</div>
<div class="form-group">
    <label>
        <input type="checkbox" id="newAdminReports"> Receive Daily Reports
    </label>
</div>
<button class="btn" onclick="createAdmin()">Create Admin</button>
```

### Admin List Table (Enhanced)
```html
<table>
    <thead>
        <tr>
            <th>Username</th>
            <th>Email</th>
            <th>Alerts</th>
            <th>Reports</th>
            <th>Created</th>
            <th>Actions</th>
        </tr>
    </thead>
    <tbody>
        <!-- Populated by loadAdmins() -->
    </tbody>
</table>
```

### Edit Admin Modal
```html
<div id="editAdminModal" style="display: none;">
    <div class="modal-content">
        <h2>Edit Admin: <span id="editAdminUsername"></span></h2>
        <div class="form-group">
            <label for="editAdminEmail">Email:</label>
            <input type="email" id="editAdminEmail">
        </div>
        <div class="form-group">
            <label>
                <input type="checkbox" id="editAdminAlerts"> Receive Alert Emails
            </label>
        </div>
        <div class="form-group">
            <label>
                <input type="checkbox" id="editAdminReports"> Receive Daily Reports
            </label>
        </div>
        <div class="form-group">
            <label for="editAdminPassword">New Password (leave blank to keep current):</label>
            <input type="password" id="editAdminPassword">
        </div>
        <button class="btn" onclick="saveAdminChanges()">Save Changes</button>
        <button class="btn secondary" onclick="closeEditModal()">Cancel</button>
    </div>
</div>
```

## Step 5: Key JavaScript Functions

### Load Admins from Database
```javascript
async function loadAdmins() {
    try {
        const { data: admins, error } = await supabase
            .from('admin_users')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error loading admins:', error);
            return;
        }

        // Render admin table with Edit buttons
        renderAdminTable(admins);
    } catch (error) {
        console.error('Error:', error);
    }
}
```

### Create Admin
```javascript
async function createAdmin() {
    const username = document.getElementById('newAdminUsername').value.trim();
    const email = document.getElementById('newAdminEmail').value.trim();
    const password = document.getElementById('newAdminPassword').value.trim();
    const receiveAlerts = document.getElementById('newAdminAlerts').checked;
    const receiveReports = document.getElementById('newAdminReports').checked;

    if (!username || !email || !password) {
        alert('Username, email, and password are required');
        return;
    }

    try {
        const { error } = await supabase
            .from('admin_users')
            .insert([{
                username,
                email,
                password,
                receive_alerts: receiveAlerts,
                receive_daily_reports: receiveReports,
                created_by: sessionStorage.getItem('adminUsername')
            }]);

        if (error) {
            alert('Error creating admin: ' + error.message);
            return;
        }

        alert('Admin created successfully!');
        loadAdmins();
        // Clear form
        document.getElementById('newAdminUsername').value = '';
        document.getElementById('newAdminEmail').value = '';
        document.getElementById('newAdminPassword').value = '';
        document.getElementById('newAdminAlerts').checked = false;
        document.getElementById('newAdminReports').checked = false;
    } catch (error) {
        console.error('Error:', error);
        alert('Error creating admin');
    }
}
```

### Update Admin
```javascript
async function saveAdminChanges() {
    const username = document.getElementById('editAdminUsername').textContent;
    const email = document.getElementById('editAdminEmail').value.trim();
    const receiveAlerts = document.getElementById('editAdminAlerts').checked;
    const receiveReports = document.getElementById('editAdminReports').checked;
    const newPassword = document.getElementById('editAdminPassword').value.trim();

    const updates = {
        email,
        receive_alerts: receiveAlerts,
        receive_daily_reports: receiveReports
    };

    // Only update password if provided
    if (newPassword) {
        updates.password = newPassword;
    }

    try {
        const { error } = await supabase
            .from('admin_users')
            .update(updates)
            .eq('username', username);

        if (error) {
            alert('Error updating admin: ' + error.message);
            return;
        }

        alert('Admin updated successfully!');
        closeEditModal();
        loadAdmins();
    } catch (error) {
        console.error('Error:', error);
        alert('Error updating admin');
    }
}
```

### Login with Email Support
```javascript
async function adminLogin() {
    const usernameOrEmail = document.getElementById('adminUsername').value.trim();
    const password = document.getElementById('adminPassword').value;

    if (!usernameOrEmail || !password) {
        alert('Please enter username/email and password');
        return;
    }

    try {
        // Try to find admin by username OR email
        const { data: admins, error } = await supabase
            .from('admin_users')
            .select('*')
            .or(`username.eq.${usernameOrEmail},email.eq.${usernameOrEmail}`)
            .eq('password', password)
            .limit(1);

        if (error || !admins || admins.length === 0) {
            alert('Invalid credentials');
            return;
        }

        const admin = admins[0];
        sessionStorage.setItem('adminLoggedIn', 'true');
        sessionStorage.setItem('adminUsername', admin.username);
        sessionStorage.setItem('adminEmail', admin.email || '');
        showDashboard();
    } catch (error) {
        console.error('Login error:', error);
        alert('Login failed');
    }
}
```

## Step 6: Testing Checklist

After implementation, test:

- [ ] Master admin can log in with existing password
- [ ] Create new admin with email works
- [ ] Edit existing admin to add email works
- [ ] Edit admin preferences (alerts/reports) works
- [ ] Change admin password works
- [ ] Login with username works
- [ ] Login with email works (once email added)
- [ ] Admin list shows all admins with correct data
- [ ] Email field is required for new admins
- [ ] Existing admins with NULL email can still log in

## Step 7: SendGrid Integration (Next Phase)

Once admins have emails, we can send alerts/reports to admins where:
- `receive_alerts = true` → Get error alerts
- `receive_daily_reports = true` → Get daily metrics email

This will be implemented in the daily report generator and health monitoring system.

---

## Estimated Implementation Time

- SQL Migration: 5 minutes
- Admin HTML/JS Updates: 45 minutes
- Testing: 15 minutes
- **Total: ~1 hour**

## Rollback Plan

If something breaks:
1. Revert admin.html to use localStorage
2. Keep Supabase table (doesn't hurt anything)
3. Fix issues and retry migration

## Notes

- Passwords are stored in plain text (not ideal, but consistent with current setup)
- Future improvement: Hash passwords with bcrypt
- Email validation happens in browser only (consider server-side validation)
- No "Forgot Password" feature yet (admin-managed system)
