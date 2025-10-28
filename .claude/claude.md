# Claude Code Working Principles

## Automation-First Approach

### 1. Log Inspection and Monitoring
**Before asking the user to check logs, Claude must:**
- Use available tools to access logs directly (Vercel CLI, Supabase API, Stripe API, etc.)
- Web search for methods to programmatically access any platform's logs or monitoring data
- Set up automated log monitoring when possible
- Only ask the user for log access if:
  - All automated methods have been exhausted
  - Special credentials or permissions are required that Claude cannot access

**Examples:**
- ✅ Use `npx vercel logs` to check deployment logs
- ✅ Use Stripe API to fetch recent events: `curl https://api.stripe.com/v1/events`
- ✅ Query Supabase directly using REST API with service role key
- ✅ Web search: "how to programmatically access [platform] logs API 2025"
- ❌ Ask user "can you check the Stripe webhook logs?"

### 2. Testing Before User Intervention
**Before asking the user to manually test, Claude must:**
- Web search for testing methods: simulators, CLI tools, API endpoints, test frameworks
- Use Stripe CLI to trigger test webhooks: `stripe trigger checkout.session.completed`
- Make API calls to test endpoints directly using curl or similar tools
- Query databases to verify state changes
- Use available SDKs or APIs to simulate user actions
- Only ask the user to test manually if:
  - No programmatic testing method exists
  - Browser-specific behavior must be verified
  - User authentication is required that cannot be simulated

**Examples:**
- ✅ Use Stripe CLI: `stripe trigger webhook_event_type`
- ✅ Use curl to test API endpoints
- ✅ Query database before/after to verify changes
- ✅ Web search: "how to test [feature] programmatically without manual testing"
- ❌ Ask user "try another test purchase and let me know if it works"

### 3. Proactive Environment Instrumentation
**Claude should proactively:**
- Set up logging, monitoring, and debugging infrastructure
- Add comprehensive error logging with detailed context
- Implement health checks and validation
- Create test scripts that can be run automatically
- Document testing procedures for future automated runs

### 4. Iterative Problem-Solving Protocol
When troubleshooting issues:
1. **Gather data automatically** - Use all available APIs and tools to inspect current state
2. **Research solutions** - Web search for similar issues, best practices, and solutions
3. **Consider caching issues** - Always evaluate whether browser cache, CDN cache, service worker cache, or application state cache could be contributing to the problem
4. **Implement fixes with instrumentation** - Add logging and validation
5. **Test programmatically** - Use automated methods to verify fixes
6. **Only then** ask user to manually verify if automated testing is insufficient

**Caching troubleshooting checklist:**
- Browser cache: Suggest hard refresh (Cmd+Shift+R on macOS)
- Application state: Check if old data is persisted in localStorage/sessionStorage
- CDN/Edge cache: Verify deployment timestamp vs. cached asset timestamp
- API responses: Check if API responses are being cached when they shouldn't be
- Build artifacts: Ensure latest build is deployed (check deployment IDs)

### 5. Self-Sufficiency Mindset
Claude should always ask: "Can I access this information or test this myself?" before involving the user.

**Available tools for self-sufficiency:**
- Bash: Run CLI commands, scripts, API calls
- WebSearch: Find testing methods, APIs, debugging techniques
- Read/Write: Access configuration, logs, code
- Curl: Test HTTP endpoints, APIs
- Database queries: Verify data changes
- Stripe/Vercel/Supabase CLIs: Trigger events, check status

## Development Environment
**Platform: macOS**
- Use macOS-specific keyboard shortcuts: Cmd+Shift+R (hard refresh), Cmd+Option+I (DevTools)
- File paths use forward slashes: `/Users/username/...`
- Bash shell is zsh by default (macOS Catalina+)
- When providing terminal commands, ensure they work in zsh/bash on macOS
- Package managers: Homebrew (`brew`), npm, npx are typically available
- Use `open` command to open files/URLs from terminal

**Common macOS keyboard shortcuts to reference:**
- Hard refresh browser: `Cmd+Shift+R`
- Open DevTools: `Cmd+Option+I`
- Force quit: `Cmd+Option+Esc`
- Spotlight search: `Cmd+Space`

## Communication Style
- Be concise and action-oriented
- Show progress with todos
- Only involve user when truly necessary
- When reporting findings, include what was tested and how
- Use macOS-specific terminology and shortcuts when giving instructions
