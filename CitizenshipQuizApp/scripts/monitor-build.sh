#!/bin/bash

# Build monitoring script with frequent status updates
# Usage: ./scripts/monitor-build.sh

DEVICE_ID="00008110-001C5500112A801E"
LOG_FILE="build-times.log"

echo "🔨 Starting iOS build with monitoring..."
echo "📅 Build started at $(date '+%Y-%m-%d %H:%M:%S')"
echo ""

START_TIME=$(date +%s)
LAST_UPDATE=0
UPDATE_INTERVAL=10  # Update every 10 seconds

# Function to show elapsed time
show_progress() {
  CURRENT_TIME=$(date +%s)
  ELAPSED=$((CURRENT_TIME - START_TIME))

  if [ $((CURRENT_TIME - LAST_UPDATE)) -ge $UPDATE_INTERVAL ]; then
    MINUTES=$((ELAPSED / 60))
    SECONDS=$((ELAPSED % 60))
    echo "⏱️  Build in progress... ${MINUTES}m ${SECONDS}s elapsed"
    LAST_UPDATE=$CURRENT_TIME
  fi
}

# Run build in background and capture output
echo "🚀 Launching build process..."
echo "📱 Target device: $DEVICE_ID"
echo ""

npx expo run:ios --device "$DEVICE_ID" 2>&1 | while IFS= read -r line
do
  echo "$line"

  # Show progress updates
  show_progress

  # Highlight key build phases
  if echo "$line" | grep -q "Planning build"; then
    echo "📋 Phase: Planning build"
  elif echo "$line" | grep -q "Installing CocoaPods"; then
    echo "📦 Phase: Installing CocoaPods"
  elif echo "$line" | grep -q "Compiling"; then
    echo "⚙️  Phase: Compiling"
  elif echo "$line" | grep -q "Linking"; then
    echo "🔗 Phase: Linking"
  elif echo "$line" | grep -q "Signing"; then
    echo "✍️  Phase: Code signing"
  elif echo "$line" | grep -q "Build Succeeded"; then
    echo "✅ Phase: Build completed successfully"
  elif echo "$line" | grep -q "Installing"; then
    echo "📲 Phase: Installing on device"
  elif echo "$line" | grep -q "Starting Metro"; then
    echo "🎯 Phase: Starting Metro Bundler"
  fi
done

# Capture exit code
BUILD_EXIT_CODE=${PIPESTATUS[0]}

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))
MINUTES=$((DURATION / 60))
SECONDS=$((DURATION % 60))

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ $BUILD_EXIT_CODE -eq 0 ]; then
  echo "✅ Build completed successfully in ${MINUTES}m ${SECONDS}s"
  echo "📅 Completed at $(date '+%Y-%m-%d %H:%M:%S')"
  echo "$(date '+%Y-%m-%d %H:%M:%S'): Build succeeded in ${DURATION}s" >> "$LOG_FILE"
else
  echo "❌ Build failed after ${MINUTES}m ${SECONDS}s"
  echo "📅 Failed at $(date '+%Y-%m-%d %H:%M:%S')"
  echo "$(date '+%Y-%m-%d %H:%M:%S'): Build failed after ${DURATION}s" >> "$LOG_FILE"
  exit $BUILD_EXIT_CODE
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Show recent build history
if [ -f "$LOG_FILE" ]; then
  echo "📊 Recent build times:"
  tail -5 "$LOG_FILE" | while IFS= read -r log_line; do
    echo "   $log_line"
  done
  echo ""
fi

exit 0
