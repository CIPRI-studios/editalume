# Editalume — independent hosting

This repository contains **only the Editalume static web app**, extracted from `caueccipriano/mylife-caue-app/public/radar/`. It does **not** move or modify the original multi-app repository.

GitHub Pages (Actions source) publishes the `site/` directory at the repo's project URL, regardless of whether this repository is under a personal account or moved to the CIPRI Studios organization. Every four hours, the publishing workflow refreshes the three public fallback snapshots from the existing collector. National dynamic queries continue to use the existing Supabase Editalume database.

## Setup checklist (manual)
1. Transfer this repo to GitHub org `CIPRI-studios` (Settings → General → Danger Zone → Transfer ownership). Confirm the exact owner in GitHub; never rename the original multi-app repo.
2. In the destination repo Settings → Pages choose **GitHub Actions**. Ensure Actions is enabled, then run the *Editalume · independent GitHub Pages* workflow. The resulting URL is `https://cipri-studios.github.io/editalume/` only after the org transfer.
3. Supabase Auth → URL Configuration: allow `https://cipri-studios.github.io/editalume/conta.html` as an **additional redirect URL** (keep the old one until real login and favorites are verified). Do not blindly change the project's global Site URL if other software uses it.
4. Update the existing `editalume-feedback` Edge Function CORS whitelist to permit `https://cipri-studios.github.io` while preserving the old origin. Verify the feedback form at the new URL.
5. Test registration email, redirect, two distinct accounts/favorites isolation and sign-out. Do not activate paid access until the real Asaas production recurring payment, verified webhook, delivery, cancellation and refund flow work.
6. Keep the original Pages link available as an interim fallback until all of the above pass.

## Caveats
- The fallback snapshot source still belongs to the former mono-repository, whose collector continues running. Eventually migrate the collector and CI to this dedicated repo before retiring the old Pages address.
- Research data is a rotating non-exhaustive sample. Validate availability and exact terms with the official PNCP.
- A paid plan is **planned** at R$ 49.90/month. Subscriptions and automatic email delivery are **not active**.
