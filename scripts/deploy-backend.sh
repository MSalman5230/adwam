#!/usr/bin/env bash
# Deploys migrations, Edge Functions and Auth settings to one Supabase project.
# Staging and production run the same steps, so every merge rehearses a production deploy.
set -euo pipefail

: "${ADWAM_ENVIRONMENT:?Set ADWAM_ENVIRONMENT to staging or production.}"
: "${ADMIN_URL:?Set ADMIN_URL to the admin page for this project.}"
if [[ "$ADWAM_ENVIRONMENT" != staging && "$ADWAM_ENVIRONMENT" != production ]]; then
  echo "Unknown environment: $ADWAM_ENVIRONMENT" >&2
  exit 1
fi
if [[ ! "${SUPABASE_PROJECT_ID:-}" =~ ^[a-z0-9]{20}$ || -z "${SUPABASE_ACCESS_TOKEN:-}" ]]; then
  echo "The $ADWAM_ENVIRONMENT environment needs SUPABASE_PROJECT_ID and SUPABASE_ACCESS_TOKEN." >&2
  exit 1
fi

pnpm server:prepare
echo "Applying $ADWAM_ENVIRONMENT migrations"
pnpm exec supabase db push --remote="$SUPABASE_PROJECT_ID" --yes
echo "Deploying $ADWAM_ENVIRONMENT Edge Functions"
pnpm exec supabase functions deploy --remote="$SUPABASE_PROJECT_ID" --use-api --yes
node scripts/supabase-auth.mjs
