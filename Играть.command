#!/bin/zsh
cd "$(dirname "$0")"

if [ ! -d node_modules ]; then
  npm install
fi

npm run dev -- --host 127.0.0.1 &
server_pid=$!

for attempt in {1..30}; do
  if curl -fsS http://127.0.0.1:5173/ >/dev/null 2>&1; then
    open http://127.0.0.1:5173/
    break
  fi
  sleep 0.2
done

wait $server_pid
