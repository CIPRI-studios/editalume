# Editalume — independent hosting

This repository contains **only the Editalume static web app**, extracted from `caueccipriano/mylife-caue-app/public/radar/`. It does **not** move or modify the original multi-app repository.

GitHub Pages (Actions source) publishes the `site/` directory at the repo's project URL, regardless of whether this repository is under a personal account or moved to the CIPRI Studios organization. The independent repository now contains its own tested PNCP collectors and a daily workflow that publishes its three fallback snapshots directly to `site/`. On first deployment only, GitHub Pages can still bootstrap missing snapshots from the old source; once its own data exists, it prefers those independent snapshots. National dynamic queries continue to use the existing Supabase Editalume database. A national 05:00 workflow also exists in this repository; verify its first complete live run before disabling the original workflow.

## Setup checklist (manual)
1. **Concluído:** repositório transferido para `CIPRI-studios/editalume`, preservando o antigo aplicativo multifuncional.
2. In the destination repo Settings → Pages choose **GitHub Actions**. Ensure Actions is enabled, then run the *Editalume · independent GitHub Pages* workflow. The resulting URL is `https://cipri-studios.github.io/editalume/` only after the org transfer.
3. Supabase Auth → URL Configuration: allow `https://cipri-studios.github.io/editalume/conta.html` as an **additional redirect URL** (keep the old one until real login and favorites are verified). Do not blindly change the project's global Site URL if other software uses it.
4. **Concluído parcialmente:** a função `editalume-feedback` já aceita `https://cipri-studios.github.io` e mantém a origem antiga; falta validar o envio real do formulário no novo domínio.
5. Test registration email, redirect, two distinct accounts/favorites isolation and sign-out. Do not activate paid access until the real Asaas production recurring payment, verified webhook, delivery, cancellation and refund flow work.
6. Keep the original Pages link available as an interim fallback until all of the above pass.

## Caveats
- New snapshots should be generated independently in this repository. The original mono-repository continues running during the verified cutover, to avoid breaking existing published URLs.
- Research data is a rotating non-exhaustive sample. Validate availability and exact terms with the official PNCP.
- Billing and notification readiness are separate from hosting migration. Consult `docs/ASAAS_LINKS_OPERACAO.md` and verify actual production flows before stating that Pro is active.

## Cloudflare free deployment
The repository is ready for an external Cloudflare Pages connection, but that account setup is not complete. See [`CLOUDFLARE_SETUP.md`](CLOUDFLARE_SETUP.md) in the repository root; preserve existing public links until new domain login, feedback and checkout are tested.
