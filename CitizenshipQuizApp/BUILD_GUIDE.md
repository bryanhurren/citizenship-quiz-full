# iOS Build Guide

This guide explains the optimized build system for the Citizenship Quiz App. The build scripts provide automated validation, real-time monitoring, and faster build times.

## Quick Start

### Standard Build with Monitoring
```bash
npm run build:monitor
```
This runs the build with progress updates every 10 seconds and tracks build time.

### Build to Device
```bash
npm run ios:device
```
Builds and installs directly to the connected iPhone (ID: 00008110-001C5500112A801E).

### Clean Build
```bash
npm run ios:clean
```
Cleans Xcode build artifacts and DerivedData, then rebuilds. Use when:
- Build is failing with cryptic errors
- You suspect cached build artifacts are causing issues

### Deep Clean Build
```bash
npm run ios:deep-clean
```
Nuclear option - clears all caches (Watchman, Metro, Xcode module cache) and rebuilds. Use when:
- Clean build didn't work
- Metro bundler has persistent issues
- After major dependency updates

## Pre-Build Validation

### Run Pre-Build Checks
```bash
npm run build:pre-check
```

This validates:
- Device is connected (00008110-001C5500112A801E)
- TypeScript type check passes
- No Metro port conflicts (port 8081)
- React versions match (react@19.1.0 === react-dom@19.1.0)

**Pro tip**: Run this before starting a build to catch issues early and avoid wasting 5+ minutes on a doomed build.

### Ensure Metro is Running
**CRITICAL**: Before building or running the app on a device, Metro bundler MUST be running. The app will show a white screen with "No script URL provided" error if Metro isn't serving the JavaScript bundle.

**Start Metro in a separate terminal**:
```bash
npx expo start --clear
```

Or use the background-friendly approach:
```bash
# Terminal 1: Start Metro
npx expo start

# Terminal 2: Build to device
npm run ios:device
```

**Signs Metro isn't running**:
- White screen after app launches
- "No script URL provided" error
- App shows logo then reverts to white screen

**Fix**: Always have Metro running before launching the app. If it's not running, start it with `npx expo start --clear`.

## Build Monitoring

The monitoring script (`scripts/monitor-build.sh`) provides:

### Real-Time Progress Updates
- Status update every 10 seconds showing elapsed time
- No need to ask "is it still building?"

### Build Phase Indicators
- 📋 Planning build
- 📦 Installing CocoaPods
- ⚙️  Compiling
- 🔗 Linking
- ✍️  Code signing
- 📲 Installing on device
- 🎯 Starting Metro Bundler

### Build Time Tracking
- Shows total build duration
- Logs to `build-times.log` for historical tracking
- Displays recent build history after completion

Example output:
```
⏱️  Build in progress... 3m 45s elapsed
⚙️  Phase: Compiling
✅ Build completed successfully in 5m 23s

📊 Recent build times:
   2025-10-27 14:32:15: Build succeeded in 323s
   2025-10-27 14:45:22: Build succeeded in 298s
```

## Cache Management

### Clear All Caches
```bash
npm run cache:clear
```

Clears:
- Watchman file watching cache
- Metro bundler cache
- Haste module map
- node_modules/.cache

Use when Metro is serving stale files or you're seeing "Unable to resolve module" errors.

## Build Optimizations

### Podfile Improvements
The Podfile has been optimized for faster builds:

**Warning Suppression**: Pods warnings are hidden for cleaner output
```ruby
config.build_settings['GCC_WARN_INHIBIT_ALL_WARNINGS'] = 'YES'
config.build_settings['SWIFT_SUPPRESS_WARNINGS'] = 'YES'
```

**Faster Compilation**: Index store disabled (not needed for release builds)
```ruby
config.build_settings['COMPILER_INDEX_STORE_ENABLE'] = 'NO'
```

**Parallel Builds**: Distribution-ready builds enabled
```ruby
config.build_settings['BUILD_LIBRARY_FOR_DISTRIBUTION'] = 'YES'
```

Expected improvement: 20-30% faster pod compilation phase.

## Troubleshooting

### Build Fails Immediately
Run pre-build checks:
```bash
npm run build:pre-check
```

Common issues:
- Device not connected - check USB cable
- Type errors - fix TypeScript errors first
- Metro already running - kill it: `lsof -ti:8081 | xargs kill -9`

### White Screen After Build
Check Metro bundler terminal for React version errors:
```
ERROR  [Error: Incompatible React versions: The "react" and "react-native-renderer" packages must have the exact same version.
```

**Fix**: Ensure react@19.1.0 and react-dom@19.1.0 are installed:
```bash
rm -rf node_modules/react node_modules/react-dom
npm install react@19.1.0 react-dom@19.1.0 --force
npm run cache:clear
npx expo start --clear
```

### Build Succeeds but App Won't Install
Device trust issue or provisioning profile:
```bash
# Check device info
xcrun devicectl list devices

# Reinstall
xcrun devicectl device uninstall app --device 00008110-001C5500112A801E com.bryanhurren.citizenshipquiz
npm run ios:device
```

### "No script URL provided" Error
App built with Xcode but can't connect to Metro:
- Always use `npm run ios:device` or `npx expo run:ios --device <id>`
- Don't use direct Xcode builds for development
- Metro must be running: `npx expo start --clear`

### Stuck at "Building JavaScript bundle"
Metro cache issue:
```bash
# Kill Metro
lsof -ti:8081 | xargs kill -9

# Clear Metro cache
npm run cache:clear

# Restart with clean cache
npx expo start --clear
```

## React Version Requirements

**Critical**: React Native 0.81.4 requires **exactly** React 19.1.0

- react@19.1.0 (not 19.2.0 or 18.x)
- react-dom@19.1.0
- @types/react@^19.1.10

The embedded react-native-renderer is pinned to 19.1.0. Version mismatches cause white screens.

## Build Time Benchmarks

Typical build times on MacBook Pro (M1):
- First build (clean): ~6-8 minutes
- Incremental rebuild: ~3-5 minutes
- Pod install only: ~2 minutes
- With optimizations: ~20-30% faster pod phase

Track your builds in `build-times.log` to monitor performance.

## Scripts Reference

| Script | Purpose | When to Use |
|--------|---------|-------------|
| `npm run ios:device` | Standard build | Daily development |
| `npm run ios:clean` | Clean build | Build errors, cache issues |
| `npm run ios:deep-clean` | Nuclear clean | Persistent issues, major updates |
| `npm run build:pre-check` | Validate setup | Before starting build |
| `npm run build:monitor` | Build with monitoring | When you want progress updates |
| `npm run cache:clear` | Clear all caches | Metro serving stale files |
| `npm run typecheck` | TypeScript check | Quick validation |

## Device ID Reference

Primary device: `00008110-001C5500112A801E` (Bryan's iPhone)

To use a different device:
1. List devices: `xcrun devicectl list devices`
2. Copy device ID
3. Update in:
   - `package.json` (ios:device script)
   - `scripts/monitor-build.sh` (DEVICE_ID variable)
   - `scripts/pre-build.sh` (device check)
