# Handoff: guamgov (2026-10-02, from the Aether root session)

## What this is
An unofficial demo of a Guam permit guide, modeled on PermitSF (https://www.sf.gov/permitsf).
Adam's dad asked for it after america.gov launched. It is a demo to show what a Guam
version could look like, not a government site.

## Current state
- Live: https://guamgov.vercel.app (verified 200, banner and content present)
- Repo: https://github.com/adamtpang/guamgov (main, pushed)
- Vercel: project `guamgov` on team adamtpangs-projects (personal), linked from this folder
- PostHog: shared fleet project snippet added via tools/analytics/posthog-rollout.mjs
- Listed in Aether/fleet.json (tier 3, live)
- Stack: one static index.html, no build step

## Page contents
Yellow "Unofficial demo, not affiliated with the Government of Guam" banner, a search box,
and five permit cards: building, starting a business, food business, land and zoning,
clearing or septic. Each has 3-4 steps and an agency link.

## Known gaps (fix first)
- Agency links and steps are illustrative guesses, NOT verified against current Guam rules.
  Unverified: dpw.guam.gov, dphss.guam.gov, dlm.guam.gov, epa.guam.gov, guamtax.com.
  Check each URL resolves and points to the real permit page.
- Real content should come from Adam's dad: which permits people actually get stuck on.

## Rules
- Keep the "unofficial demo" banner on every page. No Government of Guam seal or official styling.
- Deploy production only from a clean, pushed commit.
- Vercel CLI on this machine: needs `--scope adamtpangs-projects`; it may crash on exit with a
  libuv assertion even when it succeeded, so check the live URL afterwards.
