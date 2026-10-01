/* Offline Freemium contract checks. Private Pro writes are enforced separately by
   Supabase RLS and quota triggers, not by these browser-only UI checks. */
"use strict";
const fs=require("node:fs"),vm=require("node:vm"),assert=require("node:assert/strict");
const policyCode=fs.readFileSync("site/plan-policy.js","utf8");
const ctx={window:{},URL,location:{href:"https://cipri-studios.github.io/editalume/#brasil"}};
const entries={
 "national-q":"limpeza","national-uf":"SP","national-city":"Jundiaí",
 "national-focus":"true","national-deadline":"30","national-min":"10000","national-sort":"value"
};
ctx.document={readyState:"loading",addEventListener(){},
 getElementById(id){return Object.hasOwn(entries,id)?{value:entries[id]}:null}};
vm.runInNewContext(policyCode,ctx);
const policy=ctx.window.EditalumePlanPolicy;
assert.equal(policy.limit(null),5);
assert.equal(policy.limit({user:{id:"free"},isPro:false}),5);
assert.equal(policy.limit({isPro:true,user:null}),5);
assert.equal(policy.limit({user:{id:"verified"},isPro:true}),12);
assert.equal(policy.guestFavorites,3);
assert.equal(policy.freeFavorites,5);assert.equal(policy.proFavorites,200);
assert.equal(policy.maxProSavedSearches,3);
assert.equal(policy.maxProExport,200);
let national=fs.readFileSync("site/national.js","utf8");
const init='if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();';
assert(national.includes(init),"Keep DOM init stable");
national=national.replace(init,"window.__test={args,sharedSearchUrl,downloadPage,state};");
vm.runInNewContext(national,ctx);
const probe=ctx.window.__test;
probe.state.offset=48;probe.state.items=[{pncp_id:"12345678901234-1-1/2026",title:"Exemplo"}];
let query=probe.args();
assert.equal(query.p_limit,5);assert.equal(query.p_offset,0);
assert.equal(query.p_city,null);assert.equal(query.p_focus,null);
assert.equal(query.p_days,null);assert.equal(query.p_min_value,null);
assert.equal(query.p_sort,"deadline");
assert.equal(query.p_q,"limpeza");assert.equal(query.p_uf,"SP");
assert.equal(probe.downloadPage(),undefined,"Free users cannot export via UI");
assert(national.includes("for(let offset=0;offset<max;offset+=limit)"),"Pro export must page with a finite cap");
assert(national.includes("limit=50,max=Math.min(200"),"Limit Pro export to 200 rows");
assert(national.includes('"Authorization":"Bearer "+token'),"Export requires authenticated token");
let shared=probe.sharedSearchUrl();
assert(shared.includes("q=limpeza")&&shared.includes("uf=SP"));
assert(!shared.includes("city=")&&!shared.includes("days=")&&!shared.includes("min="));
ctx.window.EditalumeAccount={user:{id:"verified"},isPro:true};
query=probe.args();
assert.equal(query.p_limit,12);assert.equal(query.p_offset,48);
assert.equal(query.p_city,"Jundiaí");assert.equal(query.p_focus,true);
assert.equal(query.p_days,30);assert.equal(query.p_min_value,10000);
assert.equal(query.p_sort,"value");
shared=probe.sharedSearchUrl();
assert(shared.includes("city=Jundia%C3%AD")&&shared.includes("days=30"));
const html=fs.readFileSync("site/index.html","utf8");
for(const id of ["national-advanced","national-locked","national-pro-tools",
 "national-save-search-form","national-free-upsell"])
 assert(html.includes('id="'+id+'"'),"Missing "+id);
assert(html.includes("pncp.gov.br/app/editais"),"Never gate official PNCP links");
const account=fs.readFileSync("site/account.js","utf8");
assert(account.includes('client.from("editalume_saved_searches")'));
assert(account.includes("if(!state.user||!state.pro)"),"Private Pro search requires verified user");
assert(account.includes("alerts_enabled:false"),"Do not activate undelivered emails");
assert(account.includes('get savedSearches(){return state.savedSearches}'));
const app=fs.readFileSync("site/app.js","utf8");
assert(app.includes('visible=isPro()?12:freePreview'));
assert(app.includes('if(!isPro()||!found.length)return'));
assert(app.includes("const premium=isPro();"),"SP fallback checks account tier");
assert(app.includes('seg=premium?$("segment").value:"all"'),"Free SP segment always defaults");
assert(app.includes('const sort=premium?$("sort").value:"deadline"'),"Free SP ordering fixed");
assert(html.includes('id="sp-advanced" disabled'),"SP advanced filters disabled for guests");
assert(html.includes('id="sp-upgrade-tip"'),"SP Free upgrade explanation available");
const sw=fs.readFileSync("site/sw.js","utf8");
assert(sw.includes("sp-free-consistency-20261001-1")&&sw.includes("plan-policy.js?v=2"));
assert(sw.includes("style.css?v=free-sp-20261001-1")&&sw.includes("app.js?v=free-sp-20261001-1"));
assert(sw.includes("account.js?v=4")&&sw.includes("national.js?v=freemium-20261001-4"));
assert(national.includes('headers.Authorization="Bearer "+token'),"Pro requests must send a Supabase JWT to the backend");
assert(account.includes("async function getAccessToken(){"),"Pro JWT token getter required");
assert(account.includes("session?.user?.id===state.user.id"),"Never use a mismatched account token");
for(const id of ["national-insights","national-insights-title","national-insight-total","national-insight-urgent","national-insight-valued","national-insight-value","national-insight-cities"])
 assert(html.includes('id="'+id+'"'),"Missing Pro insights element "+id);
assert(national.includes('API+"/rpc/editalume_pro_insights"'),"Pro analytics must come from the server");
assert(national.includes('if(isPro()&&token)void loadProInsights'),"Never call Pro analytics for Free");
assert(national.includes('"Authorization":"Bearer "+token'),"Pro analytics needs authenticated JWT");
console.log("PASS freemium: Free cap, verified Pro search and insight controls, saved searches and official source links");
