/* UI-only tier presentation. Private saved searches, quotas and entitlements
   are enforced by Supabase RLS and triggers, not by browser JavaScript. */
(function(root){
 "use strict";
 const p=Object.freeze({
  freeResultsPerSearch:5,proResultsPerPage:12,
  guestFavorites:3,freeFavorites:5,proFavorites:200,maxProSavedSearches:3,maxProExport:200,
  canUsePro(account){return Boolean(account?.user&&account?.isPro===true);},
  limit(account){return this.canUsePro(account)?this.proResultsPerPage:this.freeResultsPerSearch;}
 });
 root.EditalumePlanPolicy=p;
})(typeof window!=="undefined"?window:globalThis);
