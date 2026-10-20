#!/usr/bin/env bash
# Suite complète hors production, lancée par le vérificateur dans un conteneur Linux sans secret.
# Sortie 0 : vert ; 1 : rouge ; 2 : incomplet ou infrastructure.
set -u
cd "$(dirname "$0")/.."

# Prérequis du conteneur : sans eux, le résultat n'est pas un rouge du code.
for outil in node npm uv; do
  command -v "$outil" >/dev/null 2>&1 || { echo "outil manquant : $outil" >&2; exit 2; }
done
command -v chromium >/dev/null 2>&1 || [ -n "${CHROMIUM_PATH:-}" ] || { echo "Chromium introuvable" >&2; exit 2; }

rouge=0

node scripts/check_data.mjs || rouge=1

(cd worker && npm ci --omit=dev --silent) || { echo "installation du relais impossible" >&2; exit 2; }
(cd worker && npm test --silent) || rouge=1

if [ -n "${CHROMIUM_PATH:-}" ] || command -v chromium >/dev/null 2>&1; then
  uv run --with playwright python scripts/check_pages.py || rouge=1
fi

exit "$rouge"
