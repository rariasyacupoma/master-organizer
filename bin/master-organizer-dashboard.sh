#!/usr/bin/env bash
# Start (or restart) the Master Organizer dashboard server.
cd "$(dirname "${BASH_SOURCE[0]}")/../master-organizer-ui"

PORT=7891
PID=$(lsof -ti:$PORT 2>/dev/null)

if [ -n "$PID" ]; then
  echo "Stopping existing server (PID $PID)..."
  kill -9 $PID 2>/dev/null
  # Wait until the port is actually free
  for i in $(seq 1 20); do
    sleep 0.3
    lsof -ti:$PORT &>/dev/null || break
  done
fi

echo "Starting Master Organizer on http://localhost:$PORT"
python3 server.py &>/tmp/master-organizer-server.log &
SERVER_PID=$!
echo "PID $SERVER_PID"

# Wait until the server is accepting connections
for i in $(seq 1 20); do
  sleep 0.5
  curl -s --connect-timeout 1 --max-time 2 -o /dev/null -w "%{http_code}" http://localhost:$PORT/ 2>/dev/null | grep -q 200 && break
done

open "http://localhost:$PORT"
