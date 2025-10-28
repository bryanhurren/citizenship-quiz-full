# MCP Server Setup Guide

**Date**: 2025-10-25
**Project**: CitizenshipQuiz

---

## Recommended MCP Servers

### Phase 1: Essential (Start Here)

Install these 2 MCP servers for immediate value:

1. **Context7** - Up-to-date documentation
2. **Playwright** - Browser automation and testing

---

## Installation Steps

### 1. Create/Edit Claude Desktop Config

**File location**: `~/Library/Application Support/Claude/claude_desktop_config.json`

```bash
# Create directory if it doesn't exist
mkdir -p ~/Library/Application\ Support/Claude

# Edit config file
nano ~/Library/Application\ Support/Claude/claude_desktop_config.json
```

### 2. Paste This Configuration

```json
{
  "mcpServers": {
    "context7": {
      "command": "npx",
      "args": ["-y", "@upstash/context7-mcp"]
    },
    "playwright": {
      "command": "npx",
      "args": ["-y", "@playwright/mcp"]
    }
  }
}
```

### 3. Save and Restart Claude Desktop

- Save file: `Ctrl+O`, `Enter`, `Ctrl+X`
- Quit Claude Desktop completely
- Reopen Claude Desktop
- Verify: Check settings for MCP servers

---

## What Each Server Does

### 1. Context7 ✅ RECOMMENDED
**What it does**: Fetches always-current, version-specific documentation for any library or framework

**How to invoke (manual commands)**:
```
You: "Get the latest Expo SDK 54 Google Sign-In documentation"
You: "Show me the current Stripe API docs for creating subscriptions"
You: "What's the latest React Navigation v6 API for tab navigators?"
```

**How Claude auto-uses it**:
- When you ask about implementing a feature → Claude fetches current docs automatically
- When debugging API errors → Claude checks if the API has changed
- When suggesting code → Claude verifies against latest documentation
- Before answering "how to" questions → Claude gets current best practices
- When library versions are mentioned → Claude retrieves version-specific info

**Benefits**:
- ✅ No more outdated API examples
- ✅ Version-specific code (e.g., Expo SDK 54)
- ✅ Prevents hallucinated APIs
- ✅ Current best practices

**Token Cost**: +500-1,000 tokens per request (when docs needed)

---

### 2. Playwright ✅ RECOMMENDED
**What it does**: Full browser automation - navigate sites, click buttons, fill forms, take screenshots, test interactive flows

**How to invoke (manual commands)**:
```
You: "Open https://www.theeclodapps.com and take a screenshot"
You: "Navigate to the site, click 'Get Premium', and screenshot the Stripe checkout page"
You: "Test the login flow by clicking Google Sign-In button"
```

**How Claude auto-uses it**:
- After deployments → Claude tests the site to verify it's working
- When you report UI bugs → Claude navigates to the page and screenshots the issue
- When implementing new features → Claude tests the interactive flow
- Before confirming fixes → Claude verifies the bug is actually fixed
- When you ask "is the site working?" → Claude checks automatically

**Benefits**:
- ✅ Test web app interactively
- ✅ Verify deployments instantly
- ✅ Take screenshots of bugs
- ✅ Debug UI issues visually
- ✅ Generate E2E tests
- ✅ Test login flows

**Token Cost**: +1,000-2,000 tokens per browser session

---

### 3. Stripe MCP ⚠️ OPTIONAL (Phase 2)
**What it does**: Direct Stripe API integration - query subscriptions, customers, payments, webhooks

**How to invoke (manual commands)**:
```
You: "Look up the subscription for customer cus_RFTqfaS0bkNQiU"
You: "Show me all active subscriptions"
You: "Get the payment details for invoice inv_abc123"
```

**How Claude auto-uses it**:
- When subscription bugs occur → Claude queries Stripe directly to see actual data
- When users report billing issues → Claude checks subscription status
- When debugging webhooks → Claude verifies what Stripe actually sent
- When you ask "why isn't this working?" → Claude compares database vs Stripe
- When implementing payment features → Claude references current Stripe docs

**Benefits**:
- ✅ Query subscriptions directly
- ✅ Debug billing issues faster
- ✅ Verify webhook data
- ✅ Search Stripe docs
- ✅ See real-time subscription status

**Token Cost**: +500-1,500 tokens per request

**⚠️ Security Note**: Use TEST key only, never production key!

---

### 4. Fetch MCP ❌ NOT RECOMMENDED
**What it does**: Makes HTTP GET requests and retrieves web content as markdown

**Why NOT recommended for this project**:
- Playwright does everything Fetch does + much more
- Fetch can't click buttons or interact with pages
- Fetch can't handle JavaScript-rendered content
- Fetch can't test login flows or forms
- Your app needs interactive testing, not just static content fetching

**Alternative**: Use Playwright for web testing, `curl` for API testing

**How it WOULD work** (if you installed it):
```
You: "Fetch the content from https://stripe.com/docs/api"
You: "Get the HTML from my website"
```

**How Claude would auto-use it**:
- When researching documentation
- When checking if external sites are up
- When verifying content is published

**Token Cost**: +200-500 tokens per request

---

### 5. Memory MCP ❌ NOT RECOMMENDED
**What it does**: Stores persistent facts about your project in a knowledge graph across all Claude sessions

**Why NOT recommended**:
- **Token bloat**: Adds 1,000-3,000 tokens to EVERY request (even when not needed)
- **Outdated info**: Memories can become stale as project evolves
- **No transparency**: You can't easily see or edit what's remembered
- **Complexity**: Hard to debug when Claude "remembers" wrong information
- **Cost**: 3-5x more expensive conversations

**Alternative**: Use `PROJECT_STATE.md` (see below)

**How it WOULD work** (if you installed it):
```
You: "Remember that we deploy from CitizenshipQuizWeb directory only"
You: "Store the fact that we use Stripe for web and RevenueCat for iOS"
```

**How Claude would auto-use it**:
- Recalls project decisions automatically
- Remembers architecture choices
- Stores configuration details
- Recalls past bugs and solutions

**Token Cost**: +1,000-3,000 tokens PER REQUEST (always on)

---

### 6. Multi-Agent Coordinator ❌ NOT RECOMMENDED
**What it does**: Allows multiple Claude agents to work on the same codebase simultaneously with file locking

**Why NOT recommended**:
- **Too new**: Just released in 2025, likely unstable
- **Complexity**: Harder to debug when multiple agents involved
- **Overkill**: This project doesn't need parallel agent coordination
- **Unclear benefits**: No proven advantage for solo developer workflows

**Alternative**: Use separate Claude Desktop windows for different tasks

**How it WOULD work** (if you installed it):
- Agent 1 works on frontend while Agent 2 works on backend
- Prevents file conflicts with locking mechanism
- Coordinates task distribution

**How Claude would auto-use it**:
- When you request large multi-part implementations
- When parallel work could speed up development

**Token Cost**: Unknown, but likely significant overhead

---

## Phase 2: Optional Add-Ons

### Stripe MCP (Add Later If Needed)

**When to add**: If frequently debugging payment/subscription issues

```json
{
  "mcpServers": {
    "context7": { ... },
    "playwright": { ... },
    "stripe": {
      "command": "npx",
      "args": ["-y", "@stripe/mcp", "--tools=all"],
      "env": {
        "STRIPE_SECRET_KEY": "sk_test_your_test_key_here"
      }
    }
  }
}
```

**⚠️ Security Note**: Use TEST key, not live key!

**Benefits**:
- ✅ Query subscriptions directly
- ✅ Debug billing issues
- ✅ Verify webhook data
- ✅ Search Stripe docs

**Token Cost**: +500-1,500 tokens per request

---

## NOT Recommended

### ❌ Fetch MCP
**Why not**: Playwright does everything Fetch does + more
**Alternative**: Use Playwright for browser testing, `curl` for API testing

### ❌ Memory MCP
**Why not**: Token bloat, outdated memories, complexity
**Alternative**: Use `PROJECT_STATE.md` file (see below)

### ❌ Multi-Agent Coordinator
**Why not**: Too new (2025), complex, unstable
**Alternative**: Use separate Claude Desktop windows

---

## Alternative: Manual Context Management

**Instead of Memory MCP, create this file:**

`/Users/bryanhurren/Documents/claude-test/.claude/PROJECT_STATE.md`

```markdown
# Project State

**Last Updated**: 2025-10-25

## ✅ Completed
- Fixed duplicate subscription bug
- Deployed monitoring endpoints
- Added Sentry support (needs DSN config)
- Created health check endpoint

## 🔄 In Progress
- Nothing currently

## ⏳ Pending
- Run admin_email_migration.sql in Supabase
- Run daily_metrics_migration.sql in Supabase
- Configure SendGrid:
  - SENDGRID_API_KEY
  - SENDGRID_FROM_EMAIL
  - ADMIN_EMAIL
- Set up BetterUptime monitoring
- Configure Sentry DSN

## 🐛 Known Issues
- None currently

## 📝 Recent Decisions
- Using Stripe for web, RevenueCat for iOS
- Vercel Hobby plan (12 function limit)
- Deploy from CitizenshipQuizWeb/ directory only
```

**Benefits**:
- ✅ No token overhead
- ✅ You control what's tracked
- ✅ Version controlled
- ✅ Transparent and editable
- ✅ Works across all sessions

---

## Expected Cost Impact

### Without MCP Servers
- Average conversation: $0.01-0.05
- Heavy session: $0.10-0.20

### With Context7 + Playwright
- Average conversation: $0.03-0.08 (~2x)
- Heavy session: $0.15-0.30 (~1.5x)
- Testing session: $0.20-0.40 (Playwright intensive)

**Worth it for:**
- ✅ Time saved debugging
- ✅ Fewer iterations
- ✅ Current documentation
- ✅ Self-service testing

---

## Verification

### Check MCP Servers Are Running

1. Open Claude Desktop
2. Look for MCP indicator in settings
3. Try a test command:

**Test Context7**:
```
You: "What's the current way to configure Google Sign-In in Expo SDK 54?"
Me: [Should fetch and show current docs]
```

**Test Playwright**:
```
You: "Open https://www.theeclodapps.com and take a screenshot"
Me: [Should launch browser and return screenshot]
```

---

## Troubleshooting

### MCP Servers Not Showing Up
```bash
# Check config file syntax
cat ~/Library/Application\ Support/Claude/claude_desktop_config.json | python3 -m json.tool

# Restart Claude Desktop completely
# (Quit, not just close window)
```

### Context7 Not Working
```bash
# Test npx works
npx -y @upstash/context7-mcp --version

# Check internet connection
# Context7 needs internet to fetch docs
```

### Playwright Not Working
```bash
# Test installation
npx -y @executeautomation/mcp-playwright --version

# May need to install browsers
npx playwright install
```

---

## Removing MCP Servers

To remove an MCP server:

1. Edit config file
2. Remove the server block
3. Restart Claude Desktop

```json
{
  "mcpServers": {
    // Remove the server you don't want
  }
}
```

---

## Next Steps

1. ✅ Install Context7 + Playwright (Phase 1)
2. ⏳ Test them for 1-2 weeks
3. ⏳ Decide if Stripe MCP needed (Phase 2)
4. ✅ Create PROJECT_STATE.md for context tracking

---

**Questions or issues?** Check Claude Desktop logs:
- macOS: `~/Library/Logs/Claude/`
