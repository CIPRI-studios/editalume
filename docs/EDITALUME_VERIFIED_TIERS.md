# Editalume · verified Free/Pro search contract

## Production backend checkpoint — 2026-10-01
Supabase project `jhxhbgprjqppzfrjdfvj`, migration `20261001201449_editalume_server_verified_free_pro_search` applied. The public `editalume_search` RPC checks entitlement on the database with a nonexposed private helper that only examines the current `auth.uid()`. The RPC remains `SECURITY INVOKER`; it never trusts `isPro`, URL parameters, stored browser data or user-editable metadata as evidence of a subscription.

| Behavior | Free/guest | Verified active Pro |
| --- | --- | --- |
| Keyword and state search | Yes | Yes |
| Results per request | Hard cap 5 | Up to 60 (12 in UI) |
| Page offsets | Ignored | Enabled |
| City, sector, deadline, minimum value | Ignored by backend | Enabled |
| Sorting by value or relevance | Deadline order only | Enabled |
| Official PNCP source links | Available | Available |
| Saved private searches | Database rejects non-Pro | Up to 3 |
| Cloud favorites | Maximum 5 for Free | Maximum 200 |

The backend still holds public PNCP-sourced notices, which are also available directly at the official PNCP. We do **not** claim to own or restrict public procurement data: Pro sells organization and workflow convenience.

The frontend now sends a real Supabase session access token on premium RPC requests. The publishable API key by itself provides Free access; the database independently verifies plan, expiry and server-recorded verification date.

## Confirmed backend checks
With a nonauthenticated database session, requesting 60 results returned exactly five. Nonzero offset and premium-only parameters were ignored, yielding the same first five results. Function ACL permits anonymous lookup without exposing private entitlement records. Source sample availability and official deadline data remain subject to PNCP changes.

## Still necessary before accepting any Pro subscription
- Use **two independent real email accounts** and a separately authorized sandbox entitlement to check paid tools, scope isolation, logout and expiry. Do not grant Pro merely through a frontend setting.
- Verify end-to-end email delivery, real subscription payment confirmation via authenticated webhook, cancellation, and clear customer support/refund flows.
- Keep recurring billing **disabled** and avoid promising automated daily alerts until verified delivery exists.
- Keep old public site as a temporary fallback. Note: the previous site's advanced filters are no longer a supported paid-access path; direct visitors should use the official CIPRI Studios site.

## Diagnostics
- GitHub workflows: `Editalume · freemium contract QA`, `Editalume · password auth QA` and independent Pages deployment.
- Supabase migrations: `editalume_server_verified_free_pro_search`.
- Security review: `editalume_internal.caller_has_verified_pro` has a fixed, empty `search_path`, checks `auth.uid()`, exposes only Boolean status via an unexposed schema, and may be executed by `anon` and `authenticated` for RPC evaluation. Never move it to the exposed `public` schema.

## Additional Pro indicators
Database migration `editalume_pro_filtered_sample_insights` adds a Pro-only, authenticated RPC. It applies the same keyword/state/city/sector/deadline/minimum filters, returning current sample count, deadlines within seven days, count and sum of reported positive estimate values, and identified city count. The RPC rejects Free users and guests. Both denied-Free and temporary-verified-Pro paths passed transactional database checks; the temporary entitlement was rolled back. UI must label these as non-exhaustive sample metrics, not guaranteed pipeline or market-size estimates.

Database migration `editalume_pro_saved_search_and_email_delivery_gate` additionally rejects edits by expired/non-Pro users and rejects `alerts_enabled=true` for **all** users until transactional email delivery has been tested. The delete operation remains available to owners so their saved data can be cleared after subscription expiry.
