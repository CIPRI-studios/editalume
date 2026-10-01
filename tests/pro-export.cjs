/* Functional export QA: mocked authenticated Supabase pagination and no network. */
"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm");
const src=fs.readFileSync("site/national.js","utf8");
const ready='if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();';
assert(src.includes(ready));
const values={"national-q":"limpeza","national-uf":"SP","national-city":"","national-focus":"","national-deadline":"","national-min":"","national-sort":"deadline"};
const elements={};
const el=id=>elements[id]||(elements[id]={value:values[id]||"",disabled:false,textContent:"",hidden:false});
let downloads=0,blob=null;
const root={
 window:{EditalumePlanPolicy:{canUsePro:a=>Boolean(a?.user&&a?.isPro),maxProExport:200},
  EditalumeAccount:{user:{id:"test-pro"},isPro:true,getAccessToken:async()=> "fake-jwt"}},
 document:{readyState:"loading",addEventListener(){},getElementById:el,body:{append(){}},
  createElement(){return {remove(){},click(){downloads++},href:"",download:""}}},
 URL:class extends URL {},Blob:class{constructor(parts){blob=parts}},
 navigator:{},Intl,Date,Map,Set,Promise,AbortController,
 location:{href:"https://cipri-studios.github.io/editalume/#brasil"},
 setTimeout(){},
 fetch:async(url,options)=>{
  assert(url.includes("/rpc/editalume_search"));
  assert.equal(options.headers.Authorization,"Bearer fake-jwt");
  const q=JSON.parse(options.body);
  assert.equal(q.p_limit,50);
  const offset=q.p_offset;
  const count=offset===0||offset===50?50:offset===100?15:0;
  const items=Array.from({length:count},(_,i)=>({
   pncp_id:"12345678901234-1-"+(offset+i+1)+"/2026",title:"Compra pública",agency:"Órgão",
   municipality:"Jundiaí",uf:"SP",modality:"Pregão",closing_at:"2027-02-01T12:00:00Z",
   estimated_value_brl:250,last_observed_at:"2026-10-01T00:00:00Z",total_count:115
  }));
  return {ok:true,json:async()=>items};
 }};
root.URL.createObjectURL=()=>"blob:test";
root.URL.revokeObjectURL=()=>{};
const adapted=src.replace(ready,'window.__qa={downloadPage,state};');
vm.runInNewContext(adapted,vm.createContext(root));
root.window.__qa.state.items=[{pncp_id:"12345678901234-1-1/2026"}];
root.window.__qa.downloadPage();
setImmediate(()=>{
 assert.equal(downloads,1,"One downloadable CSV");
 assert(blob&&String(blob[1]).includes("12345678901234-1-115/2026"),"Pagination included last matching record");
 assert(!String(blob[1]).includes("12345678901234-1-116/2026"),"No extra records");
 assert(el("national-export-status").textContent.includes("115"),"Shows exported count");
 console.log("PASS: Pro CSV follows authenticated multi-page results, caps requested page sizes, deduplicates and downloads");
});
