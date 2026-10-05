/* Standalone Editalume UI smoke with mocked public PNCP and authenticated Pro
 * responses. No real email, users, billing or external writes.
 */
"use strict";
const {chromium,webkit}=require("@playwright/test");
const fs=require("node:fs"),assert=require("node:assert/strict");
const base="http://127.0.0.1:4173/";
const states="AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO".split(" ");
const now=new Date().toISOString(),later=days=>new Date(Date.now()+days*86400000).toISOString();
const publicNational=Array.from({length:20},(_,i)=>({
 pncp_id:"00000000000001-1-"+(i+1)+"/2026",uf:"SP",municipality:"Jundiaí",
 agency:"Órgão municipal de demonstração",title:"SERVIÇOS DE LIMPEZA "+(i+1),
 modality:"Pregão eletrônico",estimated_value_brl:1000+i*100,closing_at:later(5+i),
 sector_focus:true,relevance:2,first_observed_at:now,last_observed_at:now,total_count:20
}));
const sp=Array.from({length:6},(_,i)=>({
 id:"00000000000001-1-"+(i+1)+"/2026",object:"SERVIÇOS DE LIMPEZA "+(i+1),
 organ:"Órgão de teste",city:"Jundiaí",uf:"SP",deadline:later(4+i),
 modality:"Pregão eletrônico",estimated_value_brl:1250+i*100,
 sector_focus:true,relevance:2,first_seen_at:now,last_seen_at:now,
 source_url:"https://pncp.gov.br/app/editais/00000000000001/2026/"+(i+1)
}));
const fallback={brand:"Editalume",format_version:2,generated_at:now,partial:false,
 records_examined_this_run:6,carried_forward_unreconfirmed:0,exhaustive:false,
 opportunities:sp};
const coverage=states.map(uf=>({uf,status:uf==="SP"?"partial":"not_started",
 last_success_at:uf==="SP"?now:null,records_examined:uf==="SP"?20:0}));
const cors={"access-control-allow-origin":"*","access-control-allow-methods":"GET,POST,OPTIONS",
 "access-control-allow-headers":"apikey,content-type,authorization,x-client-info"};
async function mock(page,traffic){
 await page.route("**/search-index.json*",route=>route.fulfill({json:fallback}));
 await page.route("**/refresh-status.json*",route=>route.fulfill({json:{degraded:false,attempted_at:now}}));
 await page.route("https://jhxhbgprjqppzfrjdfvj.supabase.co/functions/v1/editalume-pncp-document**",async route=>{
  const req=route.request(),u=new URL(req.url());
  if(u.searchParams.get("action")==="document")return route.fulfill({status:415,json:{ok:false,error:"PDF fixture unavailable"},headers:cors});
  return route.fulfill({json:{ok:true,pncp_id:u.searchParams.get("pncp_id"),detail:{
   numeroControlePNCP:u.searchParams.get("pncp_id"),objetoCompra:"SERVIÇOS DE LIMPEZA DEMONSTRAÇÃO",
   orgaoEntidade:{razaoSocial:"Órgão municipal de demonstração"},modalidadeNome:"Pregão eletrônico",
   dataEncerramentoProposta:later(10),valorTotalEstimado:125000,processo:"PROC-2026-01",
   modoDisputaNome:"Aberto",srp:true,amparoLegal:{nome:"Lei 14.133/2021"}
  },documents:[]},headers:cors});
 });
 await page.route("https://jhxhbgprjqppzfrjdfvj.supabase.co/rest/v1/**",async route=>{
  const req=route.request(),url=req.url(),method=req.method();
  if(method==="OPTIONS")return route.fulfill({status:204,headers:cors});
  if(url.includes("/editalume_uf_coverage"))return route.fulfill({json:coverage,headers:cors});
  if(url.includes("/rpc/editalume_search")){
   const input=req.postDataJSON()||{},jwt=req.headers().authorization||"";
   const pro=jwt==="Bearer fake-pro-jwt",limit=pro?Math.min(input.p_limit||12,60):5;
   const offset=pro?input.p_offset||0:0;
   traffic.push({kind:"search",pro,limit,offset});
   return route.fulfill({json:publicNational.slice(offset,offset+limit),headers:cors});
  }
  if(url.includes("/rpc/editalume_pro_insights")){
   const jwt=req.headers().authorization||"";
   traffic.push({kind:"insights",authorized:jwt==="Bearer fake-pro-jwt"});
   return route.fulfill({json:[{matched_opportunities:20,closing_next_seven:3,
    valued_opportunities:20,estimated_total_brl:39000,cities_covered:1}],headers:cors});
  }
  return route.fulfill({status:404,json:{error:"Unmocked endpoint"},headers:cors});
 });
}
async function check(page,{pro=false,label}){
 const errors=[],traffic=[];
 page.on("pageerror",error=>errors.push(error.message));
 if(pro)await page.addInitScript(()=>{
  window.EditalumeAccount={user:{id:"test-pro"},isPro:true,favorites:[],
   getAccessToken:async()=> "fake-pro-jwt",
   createSavedSearch:async()=>true};
 });
 await mock(page,traffic);
 await page.goto(base,{waitUntil:"domcontentloaded"});
 await page.locator(".national-result-card").first().waitFor({state:"visible",timeout:15000});
 await page.locator(".result-card").first().waitFor({state:"visible",timeout:15000});
 const expected=pro?12:5;
 assert.equal(await page.locator(".national-result-card").count(),expected,label+" national preview");
 assert.equal(await page.locator(".result-card").count(),pro?6:5,label+" SP preview");
 assert.equal(await page.locator("#national-city").isEnabled(),pro,label+" advanced national filters");
 assert.equal(await page.locator("#segment").isEnabled(),pro,label+" advanced SP filters");
 assert.equal(await page.locator("#national-download").isEnabled(),pro,label+" CSV availability");
 assert.equal(await page.locator("#national-pro-tools").isVisible(),pro,label+" saved search dashboard");
 assert.equal(await page.locator("#national-locked").isVisible(),!pro,label+" Free upgrade prompt");
 assert.equal(await page.locator(".national-result-card .tender-analysis-trigger").count(),expected,label+" analysis actions");
 if(label==="mobile-390-free"){
  await page.locator(".national-result-card .tender-analysis-trigger").first().click();
  await page.locator(".tender-analysis-panel").waitFor({state:"visible",timeout:8000});
  assert.equal(await page.locator(".tender-analysis-object").isVisible(),true,"Tender summary modal visible");
  assert((await page.locator(".tender-analysis-object").innerText()).includes("LIMPEZA"),"Tender official object rendered");
  const modalBounds=await page.locator(".tender-analysis-panel").boundingBox();
  assert(modalBounds&&modalBounds.width<=390,"Tender analysis fits mobile viewport");
  await page.locator(".tender-analysis-close").click();
 }

 if(pro){
  await page.waitForFunction(()=>document.getElementById("national-insight-total")?.textContent==="20",
   {timeout:12000});
  assert.equal(await page.locator("#national-insights").isVisible(),true,"Pro insights visible");
  assert(traffic.some(x=>x.kind==="search"&&x.pro&&x.limit===12),"Pro JWT and pagination used");
  assert(traffic.some(x=>x.kind==="insights"&&x.authorized),"Insights require verified token");
 }else{
  assert(traffic.some(x=>x.kind==="search"&&!x.pro&&x.limit===5),"Free search requests capped");
  assert(!traffic.some(x=>x.kind==="insights"),"Free must not request private insights");
 }
 const bounds=await page.evaluate(()=>({
  viewport:window.innerWidth,scrollWidth:document.documentElement.scrollWidth,
  cards:[...document.querySelectorAll(".national-search-card,.national-result-card,.national-insights")]
   .filter(el=>el.getBoundingClientRect().width>0).map(el=>{
    const r=el.getBoundingClientRect();return {left:r.left,right:r.right};
   })
 }));
 assert(bounds.scrollWidth<=bounds.viewport+4,label+" horizontal page overflow: "+JSON.stringify(bounds));
 assert(bounds.cards.every(x=>x.left>=-4&&x.right<=bounds.viewport+4),label+" clipped search cards");
 assert.deepEqual(errors,[],label+" uncaught JavaScript errors");
 await page.locator("#brasil").scrollIntoViewIfNeeded();
 await page.screenshot({path:"tests/qa-artifacts/"+label+".png",fullPage:false,animations:"disabled"});
 console.log("PASS "+label+": "+expected+" national results, SP preview, correct tier controls and no overflow");
}
async function run(){
 fs.mkdirSync("tests/qa-artifacts",{recursive:true});
 const chromiumBrowser=await chromium.launch({headless:true});
 try{
  for(const size of [{name:"desktop",w:1440,h:900},{name:"mobile-390",w:390,h:844},{name:"mobile-320",w:320,h:740}]){
   for(const plan of ["free","pro"]){
    const page=await chromiumBrowser.newPage({viewport:{width:size.w,height:size.h},serviceWorkers:"block"});
    try{await check(page,{pro:plan==="pro",label:size.name+"-"+plan});}
    finally{await page.close();}
   }
  }
 }finally{await chromiumBrowser.close();}
 const safari=await webkit.launch({headless:true});
 try{
  const page=await safari.newPage({viewport:{width:390,height:844},isMobile:true,
   hasTouch:true,deviceScaleFactor:3,serviceWorkers:"block"});
  try{await check(page,{pro:false,label:"webkit-390-free"});}
  finally{await page.close();}
 }finally{await safari.close();}
}
run().catch(error=>{console.error("BROWSER_QA_FAILURE",error.stack||String(error));process.exitCode=1;});
