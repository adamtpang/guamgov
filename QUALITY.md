# Release checks

## Local regression checks

- Run `node --test evals/regression.test.mjs` for API failure, streaming, rate-limit, and evaluation checks without paid AI calls.
- Run `python tools/build_kb.py` whenever source route content changes.
- Run `node evals/run_ask.mjs` with `KEY_ENV_FILE` pointing to the local env file for paid AI checks. Never print or commit credentials.
- Run `node evals/browser_check.mjs` with `PLAYWRIGHT_MODULE` pointing to an installed Playwright module. It starts and stops its own loopback-only dev server on port 4337. Set `TEST_PORT` to use another port.
- Set `GENERATE_SOCIAL_PREVIEW=1` during the browser check to regenerate `social-preview.png` from `tools/social-preview.html`.

The AI grader checks citation indices, external evidence, topic-specific dollar amounts, complete streams, explicit required/forbidden content, and supporting source patterns for selected questions. Quoted user valuations are distinguished from claimed fees. These are regression guards, not proof that each sentence follows from its source. A person must read cited sources and compare them with each answer, including fees, deadlines, exceptions, and translations.

## Shared rate limiting

Set `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` through Vercel's environment settings before public-scale use. Both must be present. The configured backend fails closed on outages. Without them, the bounded in-memory limiter is best effort per instance and does not enforce an account-wide or deployment-wide limit. Add an OpenRouter spending cap separately.

The integration uses atomic Redis EVAL through the [Upstash REST API](https://upstash.com/docs/redis/features/restapi). No new account or paid service was provisioned by this patch.

## Human checks still needed

- Ask agency contacts to confirm current fees, waits, inspections, food truck parking, and commissary requirements. Keep gaps marked unconfirmed until official evidence is available.
- Have fluent speakers review CHamoru, Tagalog, Chuukese, and Korean answers. Machine translations are not verified.
- Test real tasks with a Guam homeowner, food vendor, and permit-counter worker.
- Choose an approved correction inbox. The current correction page prepares a local draft only and sends nothing.
- Review screen-reader behavior and real mobile keyboard behavior on devices.
- Publish only from a clean, pushed commit, then verify production pages and run live AI checks without bypassing the public rate limit.

Source research dates refer to the previous research round on October 4, 2026. Editing styling or code must not advance those dates.

## Work status

Verified locally on October 4, 2026: 39/39 paid AI evaluation questions passed after fixes, including Tagalog and Korean; 16/16 network-mocked regression tests passed. Responsive browser checks cover all 14 pages at 320, 375, 768, and 1280 pixels in light and dark mode, with reduced motion, plus menu focus, filtered cards, local correction drafts, and interrupted-answer recovery.

Publish the quality pass from a clean, pushed commit. The original imported `AGENTS.md` and `CODEX_CONTINUE_FROM_CLAUDE.md` remain separate untracked handoff files. They were not overwritten or included in the release. `.vercelignore` excludes local handoffs, project notes, tools, evaluations, and source KB files from the public deployment; the API uses its bundled knowledge base.

Paid AI calls were used for regression diagnosis and retesting. Exact billed spend was not captured; consult OpenRouter usage rather than treating model-price estimates as actual costs.
