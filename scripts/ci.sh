#!/usr/bin/env bash
# Périmètre touché, avant commit (moins de 2 minutes). Sortie 0 : vert.
set -u
cd "$(dirname "$0")/.."
rouge=0

node scripts/check_data.mjs || rouge=1

if [ -d worker/node_modules ]; then
  (cd worker && npm test --silent) || rouge=1
else
  echo "worker/node_modules absent : tests du relais ignorés (npm ci dans worker/ pour les lancer)"
fi

# Pages dans Chromium : seulement si un navigateur est disponible (CHROMIUM_PATH ou système).
if [ -n "${CHROMIUM_PATH:-}" ] || command -v chromium >/dev/null 2>&1; then
  uv run --with playwright python scripts/check_pages.py || rouge=1
else
  echo "aucun Chromium : ouverture des pages ignorée (CHROMIUM_PATH pour l'activer)"
fi

exit "$rouge"
