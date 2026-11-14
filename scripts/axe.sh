#!/usr/bin/env bash
set -euo pipefail

# Run from the repository root. Playwright starts the local web/API servers,
# opens each component, and audits its open shadow tree with @axe-core/playwright.
npx playwright test tests/e2e/axe.spec.js
