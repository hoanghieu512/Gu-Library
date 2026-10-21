#!/bin/bash
# SessionStart hook (.claude/settings.json): installs node_modules in Claude Code cloud sessions.
# Cloud VMs set CLAUDE_CODE_REMOTE=true; locally this exits at once, the Mac has its own install.
# Skips npm ci while package.json, package-lock.json and this script are unchanged since the last
# good install. Always exits 0 so a failed install never blocks the session. A SessionStart hook's
# stdout lands in the session's context, so npm's output goes to a log file and only a failure is
# reported, in one line.

[ "$CLAUDE_CODE_REMOTE" = "true" ] || exit 0
cd "$CLAUDE_PROJECT_DIR" || exit 0

stamp=node_modules/.cloud-install.sha256
log=/tmp/cloud-install.log
if ! sha256sum --check --status "$stamp" 2>/dev/null; then
  rm -f "$stamp"
  if npm ci --no-audit --no-fund > "$log" 2>&1; then
    sha256sum scripts/cloud-install.sh package.json package-lock.json > "$stamp" || rm -f "$stamp"
  else
    echo "cloud-install: npm ci failed, see $log"
  fi
fi
exit 0
