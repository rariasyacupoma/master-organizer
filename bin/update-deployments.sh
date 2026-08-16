#!/usr/bin/env bash
# Update deployments-qa.json or deployments-prod.json from a deployment notification message.
# Usage: pbpaste | ./update-deployments.sh
#        ./update-deployments.sh < message.txt

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if [ -t 0 ]; then
  message=$(pbpaste)
else
  message=$(cat)
fi
today=$(date +%Y-%m-%d)

RESET='\033[0m'
BOLD='\033[1m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
MUTED='\033[0;90m'
RED='\033[0;31m'

# Detect environment from message
if echo "$message" | grep -qi "for PROD"; then
  env="prod"
  file="$SCRIPT_DIR/deployments-prod.json"
elif echo "$message" | grep -qi "for QA"; then
  env="qa"
  file="$SCRIPT_DIR/deployments-qa.json"
else
  echo "Could not detect environment (expected 'for PROD' or 'for QA' in message)" >&2
  exit 1
fi

echo -e "${BOLD}Detected environment:${RESET} ${CYAN}${env}${RESET}"
echo -e "${MUTED}Updating: $file${RESET}"

# Parse lines matching "  service-name --> version"
updated=0
while IFS= read -r line; do
  if [[ "$line" =~ ([a-zA-Z0-9_-]+)[[:space:]]*--\>[[:space:]]*([^[:space:]]+) ]]; then
    service="${BASH_REMATCH[1]}"
    version="${BASH_REMATCH[2]}"
    current_file="$SCRIPT_DIR/deployments-${env}.json"
    current_version=$(jq -r --arg s "$service" '.services[$s].version // "none"' "$current_file")

    # Compare versions using sort -V; skip if incoming is older
    if [ "$current_version" != "none" ] && [ "$current_version" != "$version" ]; then
      older=$(printf '%s\n%s' "$version" "$current_version" | sort -V | head -1)
      if [ "$older" = "$version" ]; then
        echo -e "  ${YELLOW}⚠ ${BOLD}$service${RESET}${YELLOW}: $version is older than current $current_version — skipped${RESET}"
        updated=$((updated + 1))
        continue
      fi
    fi

    jq --arg s "$service" --arg v "$version" --arg d "$today" \
      '.services[$s] = {"version": $v, "deployedAt": $d}' \
      "$current_file" > "${current_file%.json}.tmp.json" \
      && mv "${current_file%.json}.tmp.json" "$current_file"

    if [ "$current_version" = "none" ]; then
      echo -e "  ${GREEN}+ ${BOLD}$service${RESET}${GREEN}: (new) $version${RESET}"
    elif [ "$current_version" != "$version" ]; then
      echo -e "  ${CYAN}↑ ${BOLD}$service${RESET}${CYAN}: $current_version → $version${RESET}"
    else
      echo -e "  ${MUTED}= $service: $version (unchanged)${RESET}"
    fi
    updated=$((updated + 1))
  fi
done <<< "$message"

echo -e "\n${BOLD}Done.${RESET} ${MUTED}$updated services processed in deployments-${env}.json.${RESET}"
