#!/usr/bin/env bash
# Construiește și publică aplicația pe ramura gh-pages (GitHub Pages).
set -euo pipefail
cd "$(dirname "$0")"
npm run build
tmp=$(mktemp -d)
cp -r dist/. "$tmp"
cd "$tmp"
git init -q -b gh-pages
git add -A
git commit -q -m "Deploy"
git push -f "https://github.com/zeishor/borderin.git" gh-pages
rm -rf "$tmp"
