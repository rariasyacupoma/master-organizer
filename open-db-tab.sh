#!/usr/bin/env bash
# Focus an existing Terminal tab whose title contains ALIAS, or open a new one
# running the db-* alias from ~/.zshrc with the title set to ALIAS.
set -euo pipefail

ALIAS="$1"   # full alias name, e.g. db-uds-staging or portforward-platform-preprod

# Try to find existing tab matching the alias name
result=$(osascript <<EOF
tell application "Terminal"
    set found_w to -1
    set found_t to -1
    repeat with wi from 1 to count of windows
        tell window wi
            set orig_tab to selected tab
            repeat with ti from 1 to count of tabs
                set t to tab ti
                set tab_label to ""
                try
                    set tab_label to custom title of t
                end try
                if tab_label is "" then
                    set selected tab to t
                    set tab_label to name
                end if
                if tab_label contains "$ALIAS" then
                    set found_w to wi
                    set found_t to ti
                    exit repeat
                end if
            end repeat
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

if [ "$result" = "ok" ]; then
    echo "Focused existing tab: $ALIAS"
    exit 0
fi

# No existing tab — open a new one, set its title, then run the alias
osascript <<EOF
tell application "Terminal"
    activate
    if (count of windows) = 0 then
        do script ""
        delay 0.4
        set newTab to front window
    else
        tell application "System Events" to keystroke "t" using command down
        delay 0.4
        set newTab to front window
    end if
    -- set custom title so future focus searches can find it
    set custom title of selected tab of newTab to "$ALIAS"
    -- source zshrc so aliases are available, then run the alias
    do script "source ~/.zshrc && $ALIAS" in newTab
end tell
EOF

echo "Opened new tab for db-$ALIAS"
