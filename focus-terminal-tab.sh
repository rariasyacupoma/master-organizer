#!/usr/bin/env bash
# Focuses the Terminal tab whose title contains $TICKET_ID
set -euo pipefail

TICKET_ID="$1"

result=$(osascript <<EOF
tell application "Terminal"
    set found_w to -1
    set found_t to -1
    repeat with wi from 1 to count of windows
        tell window wi
            set orig_tab to selected tab
            repeat with ti from 1 to count of tabs
                set t to tab ti
                -- try custom title first, fall back to selecting tab and reading window name
                set tab_label to ""
                try
                    set tab_label to custom title of t
                end try
                if tab_label is "" then
                    set selected tab to t
                    set tab_label to name
                end if
                if tab_label contains "$TICKET_ID" then
                    set found_w to wi
                    set found_t to ti
                    exit repeat
                end if
            end repeat
            -- restore original tab if not found in this window
            if found_w < 0 then
                set selected tab to orig_tab
            end if
        end tell
        if found_w > 0 then exit repeat
    end repeat
    if found_w < 0 then
        return "not_found"
    end if
    tell window found_w
        set selected tab to tab found_t
    end tell
    set index of window found_w to 1
    activate
    return "ok"
end tell
EOF
)

if [ "$result" = "not_found" ]; then
    echo "No tab found for $TICKET_ID — opening new tab..."
    osascript <<EOF
tell application "Terminal"
    activate
    if (count of windows) = 0 then
        do script "use-jira-session.sh \"$TICKET_ID\""
    else
        tell application "System Events" to keystroke "t" using command down
        delay 0.3
        do script "use-jira-session.sh \"$TICKET_ID\"" in front window
    end if
end tell
EOF
    echo "Opened new tab for $TICKET_ID"
    exit 0
fi

echo "Focused tab for $TICKET_ID"
