#!/bin/sh
# Generate env.js from Vercel environment variables
# This runs as part of the Vercel build step
cat > env.js << ENVEOF
window.__ENV__ = {
  API_BASE_URL: "${API_BASE_URL:-}",
  BOT_USERNAME: "${BOT_USERNAME:-}",
};
ENVEOF
echo "Generated env.js with API_BASE_URL=${API_BASE_URL:-<empty>} BOT_USERNAME=${BOT_USERNAME:-<empty>}"
