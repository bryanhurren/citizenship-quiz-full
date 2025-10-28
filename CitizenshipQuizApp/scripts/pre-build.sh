#!/bin/bash
set -e

echo "🔍 Running pre-build checks..."
echo ""

# Check if device is connected
echo "📱 Checking device connection..."
if ! xcrun devicectl list devices | grep -q "00008110-001C5500112A801E"; then
  echo "❌ Device not connected (ID: 00008110-001C5500112A801E)"
  exit 1
fi
echo "✅ Device connected"
echo ""

# Type check
echo "📝 Running TypeScript type check..."
if ! npm run typecheck > /dev/null 2>&1; then
  echo "❌ Type check failed"
  npm run typecheck
  exit 1
fi
echo "✅ Type check passed"
echo ""

# Check for Metro conflicts
echo "🔌 Checking for Metro port conflicts..."
if lsof -i :8081 >/dev/null 2>&1; then
  echo "⚠️  Metro is already running on port 8081"
  echo "   You may want to kill it first: lsof -ti:8081 | xargs kill -9"
else
  echo "✅ Port 8081 is available"
fi
echo ""

# Check React version compatibility
echo "⚛️  Checking React version compatibility..."
REACT_VERSION=$(node -e "console.log(require('./node_modules/react/package.json').version)")
REACT_DOM_VERSION=$(node -e "console.log(require('./node_modules/react-dom/package.json').version)")

if [ "$REACT_VERSION" != "$REACT_DOM_VERSION" ]; then
  echo "❌ React version mismatch!"
  echo "   react: $REACT_VERSION"
  echo "   react-dom: $REACT_DOM_VERSION"
  exit 1
fi

if [[ "$REACT_VERSION" != "19.1.0" ]]; then
  echo "⚠️  React version is $REACT_VERSION (expected 19.1.0 for React Native 0.81.4)"
fi
echo "✅ React versions match: $REACT_VERSION"
echo ""

echo "✅ All pre-build checks passed!"
echo ""
