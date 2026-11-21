#!/usr/bin/env bash
# 한글 주석
set -euo pipefail

NAME="world"
count=3

greet() {
  local who="$1"
  echo "Hello, ${who}!"
}

for i in $(seq 1 "$count"); do
  greet "$NAME" >/dev/null
done
echo $NAME
