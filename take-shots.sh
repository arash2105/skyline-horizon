#!/bin/bash
# Take the four screenshots with headless Chromium and convert them to JPEG.
# Run from the repository root: `bash take-shots.sh`.
set -e
ROOT="$(cd "$(dirname "$0")" && pwd)"
CHROME="$HOME/.cache/ms-playwright/chromium-1148/chrome-linux/chrome"
PORT=8080

node "$ROOT/serve.ts" --port $PORT > /tmp/skyline-serve.log 2>&1 &
SERVER_PID=$!
trap 'kill $SERVER_PID 2>/dev/null || true' EXIT
for _ in $(seq 1 30); do
  curl -s -o /dev/null "http://127.0.0.1:$PORT/index.html" && break
  sleep 0.5
done

take_shot() {
  local name="$1" query="$2"
  "$CHROME" --headless=old --no-sandbox --disable-gpu --hide-scrollbars \
    --force-device-scale-factor=1 --window-size=1280,720 --virtual-time-budget=8000 \
    --screenshot="/tmp/skyline-$name.png" \
    "http://127.0.0.1:$PORT/index.html$query" > /dev/null 2>&1
  python3 - "$name" <<'EOF'
import sys
from PIL import Image
name = sys.argv[1]
img = Image.open(f"/tmp/skyline-{name}.png").convert("RGB")
img.save(f"screenshots/{name}.jpg", "JPEG", quality=82)
print(name, img.size)
EOF
}

cd "$ROOT"
take_shot 1-cover "?shot=cover&seed=42"
take_shot 2-play "?shot=play&seed=42"
take_shot 3-danger "?shot=danger&seed=42"
take_shot 4-land "?shot=land&seed=42"
ls -lh screenshots/
