# Editalume independent free hosting (prepared; NOT connected)
The independent site is in `site/`. The scheduled GitHub Actions
`catalog.yml` produces `site/opportunities.json`,
`site/search-index.json`, and `site/refresh-status.json`
in this repository. Fallback does not make claims of exhaustive coverage.

Cloudflare Pages > Create application > Import existing Git repository:
- Connect only `CIPRI-studios/editalume` from the organization.
- Production branch: `main`.
- Root: repository root.
- Framework: None.
- Build command: `exit 0`.
- Build output directory: `site`.
- Let Pages rebuild when `site/**` changes. An optional build watch
  rule can skip `radar/**`, `tests/**`, and documentation-only commits.
- Do not switch the public address until Supabase Auth email redirects,
  feedback CORS, Pro checkout/webhook and account flows pass on the
  actual new `*.pages.dev` origin.
- Keep the current site serving meanwhile. Cloudflare deployment and
  its resulting address are **not** provisioned by this repository.
- A free plan has quotas; zero cost is conditional on staying within limits.

The national ingest workflow is deliberately preflight-only until
Supabase's existing OIDC function authorizes this *exact* repository
ID and workflow_ref; do not delete the legacy scheduled collector first.
