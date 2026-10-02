# Goal: guamgov loop (set 2026-10-02 by Adam)

## Purpose
A proof of concept to show Adam's dad. Bar: beautiful (America.gov style) and
honest. Accuracy is flagged, not perfected.

## Done means
1. Four complete routes, each a page like `food-truck.html`:
   - Food truck (done)
   - Typhoon repair (done, round 1)
   - Build a house, addition, or fence
   - Clear and grade a lot (Guam EPA, plus septic)
2. Every step links to an official source. Every link is checked each round,
   and a broken link is fixed or flagged.
3. Anything not confirmed from a primary source goes in a yellow "Not yet
   confirmed" box. Never guess a fee, form, or requirement.
4. Homepage cards link to each route, and the search box finds each one.
5. Looks right on phone, desktop, and dark mode.
6. A "Questions for Dad" list in this file collects every fact only a person
   can answer.

When 1-6 hold, or only questions for Dad remain: stop and report.

## Rules
- Keep the "Unofficial demo" banner on every page. No Government of Guam seal
  or official styling.
- No AI answer box yet. Keyword search only.
- Autonomy: may commit, push, and deploy to production each round, from a
  clean pushed commit. Verify the live URL afterwards. The Vercel CLI needs
  `--scope adamtpangs-projects`.
- dphss.guam.gov returns 403 to this machine. Link its forms, but flag them as
  unconfirmed.

## Questions for Dad
- Food truck: where can a truck legally park and sell? Does a mayor or DLM
  approve the spot?
- Food truck: is a commissary kitchen required?
- How long does each clearance really take, and what does it cost in total?
- Which permits do people actually get stuck on?
- Typhoon: what does a typical roof repair permit cost, and how long does it
  take after a big storm? Did DPW fast-track repair permits after Mawar?
