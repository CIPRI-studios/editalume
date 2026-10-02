# Editalume — Cloudflare Pages free deployment (prepared; account not connected)

The independent production source is `CIPRI-studios/editalume`.
The new repository has a **verified** GitHub Actions national collection at 05:00
Brazil time. It collects bounded PNCP samples from all 27 UFs into the existing
Editalume Supabase database using signed GitHub OIDC, without service keys on GitHub.
The old monorepo's **national automatic** schedule has been retired and
its remaining manually triggered workflow runs offline regression tests only.
National production updates now belong exclusively to this repository. The new `.github/workflows/pages.yml` builds extra
static fallback snapshots from *public read-only data in that Supabase project* every
four hours. Static snapshots are generated during deployment and are **not**
committed to this repository.

## Connect the account once (user action required)

In https://dash.cloudflare.com/ go to **Workers & Pages**, create a **Pages**
application, connect your GitHub account, and authorize *only*
`CIPRI-studios/editalume` (or the minimum scope your provider permits).
Choose these build settings:

- Production branch: `main`
- Framework preset: `None` (plain static site)
- Root directory: repository root
- Build command: `python3 -m unittest radar.test_build_snapshots -v && python3 radar/build_snapshots.py --out site`
- Build output directory: `site`
- No Supabase private key, service role or customer data in build settings.
- Cloudflare's Python runtime should be present. If a Python version mismatch
  appears, set `PYTHON_VERSION=3.12` and review the Cloudflare build logs.

Share only the resulting public `https://<name>.pages.dev` address for
live validation. Do **not** share access tokens, secret keys or deploy hooks.

## Keep 4-hour live snapshots fresh

GitHub's 4-hour Pages schedule rebuilds only GitHub Pages. Cloudflare Git
integration normally builds after Git commits, not when independent Supabase
data changes. Therefore:
1. In the connected Cloudflare Pages project's **Settings > Builds &
   deployments > Deploy hooks**, create a production deploy hook for `main`.
2. In the GitHub repo's **Settings > Secrets and variables > Actions**, add a
   repository secret named `CLOUDFLARE_PAGES_DEPLOY_HOOK` with its private
   URL. Never commit this URL or share it in chat.
3. Our `.github/workflows/cloudflare-refresh.yml` then POSTs that hook on
   a staggered four-hour UTC schedule, and Cloudflare reruns the verified
   build command. Before that secret exists, the workflow only logs a
   setup notice and creates **no Cloudflare deployments**.

Six scheduled deploy-hook rebuilds per day are approximately 180 builds per
30-day month, plus Git commit builds. Cloudflare's free Pages plan has quota
limits and free operation depends on staying within them; monitor usage.

## Safely switch the customer-facing address

1. Keep the current GitHub Pages technical preview online during the change.
2. Add `https://<name>.pages.dev/conta.html` to the *existing* Editalume
   Supabase Auth redirect allowlist **without removing the original**.
3. Allow the exact new origin in the `editalume-feedback` function's
   allowed CORS origins, keeping the current origin.
4. On the new domain, test email confirmation, login/logout, separate accounts'
   favorites, Free/Pro entitlements, Asaas recurring and one-off checkout
   redirection, verified production webhook processing, cancellation/refunds,
   and actual email delivery **before promoting the new link**.
5. Only after end-to-end production validation, make the new URL primary;
   do not send prospects a preview checkout that is not tested.

GitHub Pages is only the existing temporary technical preview. Cloudflare
account provisioning and authorization cannot be completed by committed
repository code alone. National coverage remains an intentionally limited
sample; every official notice and deadline needs PNCP confirmation.
