# Editalume — independent operations

## Live architecture
- Primary independent repository: `CIPRI-studios/editalume`.
- National PNCP discovery: `.github/workflows/radar-national.yml` in **this** repository.
  It runs daily at 08:00 UTC / 05:00 São Paulo (GitHub may delay scheduled starts),
  runs safety/unit tests first, scans a bounded non-exhaustive sample of 27 UFs,
  and submits signed GitHub OIDC reports to Supabase `editalume-ingest`.
- Supabase database: the existing Editalume project. Public national search is
  read-only from Supabase and the API's table/RPC policies govern frontend access.
- Supplementary static SP sample: `radar/build_snapshots.py` reads only the
  **public, read-only** Editalume Supabase API and builds `search-index.json`,
  `opportunities.json` and `refresh-status.json` during the independent
  `.github/workflows/pages.yml` publication. Every four hours, independent
  snapshot generation and site publication are scheduled. The JSON timestamps
  refer to the original verified sample, not to the file generation event.
- Neither pipeline needs to download data or code from the old monorepo.

## Validation / operational watch
- Watch both workflows in the Actions tab after updates.
- Check Supabase `editalume_uf_coverage` for all 27 UFs and recent
  `last_success_at` times. `complete_sample` is **not** national exhaustiveness:
  sampling is deliberately bounded and PNCP may limit requests.
- A failed live snapshot fetch blocks **new publication** rather than inventing
  fresh data; the previously published version remains available.
- Use `workflow_dispatch` with 1–3 states for a bounded collection smoke test.
- Public static SP snapshots are merely a supplementary sample; the national
  results come from the live Supabase database. Confirm every tender and deadline
  with official PNCP records.

## Commercial hosting and go-live
- GitHub Pages currently serves the independent technical preview. It is not
  the planned permanent host for a commercial SaaS. Move the `site/` output
  to a hosting provider whose free tier allows this commercial use, e.g.
  Cloudflare Pages, **before ongoing commercial operation**; provider login
  and GitHub authorization may be required. Do not present preview hosting as
  a permanent compliant commercial host.
- Keep the existing Supabase project and its auth redirect allowlist. Add the
  new host's `/conta.html` redirect before switching traffic; never remove
  an active login URL without testing it.
- Verify real sign-in, two-account favorites isolation, plan entitlement,
  recurring Asaas webhook, refunds/cancellation and real email delivery
  separately. This infrastructure migration does **not** assert those
  commercial features are verified.

## Operations monitoring
The independent radar-health.yml workflow checks 27 UFs at 08:00 Sao Paulo each day; it raises one GitHub issue when freshness fails and closes it on recovery. Failed site deployments are visible in GitHub Actions.
