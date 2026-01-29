#!/bin/bash
# Hook to enforce pnpm usage - block npm and yarn commands
# Receives JSON on stdin: {"tool_input": {"command": "..."}}

command=$(cat | jq -r '.tool_input.command // empty')

if [[ "$command" == npm* ]] || [[ "$command" == "npm "* ]] || \
   [[ "$command" == yarn* ]] || [[ "$command" == "yarn "* ]]; then
  echo '{"decision": "block", "reason": "Use pnpm instead of npm/yarn in this project"}'
  exit 0
fi

echo '{"decision": "approve"}'
exit 0
