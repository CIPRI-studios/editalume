/* Editalume: CNPJ -> company profile -> indicative opportunity matches.
   CNPJ lookup is user-initiated. Profile data is stored only in this browser. */
(()=>{
"use strict";
const API="https://jhxhbgprjqppzfrjdfvj.supabase.co/rest/v1";
const KEY="sb_publishable_O85v7HRJg7br9kxUbvticw_NNO8jp4w";
const CNPJ_API="https://brasilapi.com.br/api/cnpj/v1/";
const STORAGE_KEY="editalume_company_fit_v1";
const $=id=>document.getElementById(id);
const core=window.EditalumeCompanyFitCore;
if(!core)return;

const money=new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL",maximumFractionDigits:0});
const dt=new Intl.DateTimeFormat("pt-BR",{dateStyle:"short",timeStyle:"short",timeZone:"America/Sao_Paulo"});
const state={profile:null,controller:null,busy:false};

function node(tag,cls,text){
 const el=document.createElement(tag);
 if(cls)el.className=cls;
 if(text!==undefined)el.textContent=String(text);
 return el;
}
function clear(el){el.replaceChildren()}
function onlyDigits(value){return String(value||"").replace(/\D/g,"")}
function formatCnpj(value){
 const v=onlyDigits(value).slice(0,14);
 return v.replace(/^(\d{2})(\d)/,"$1.$2").replace(/^(\d{2})\.(\d{3})(\d)/,"$1.$2.$3")
  .replace(/\.(\d{3})(\d)/,".$1/$2").replace(/(\d{4})(\d{1,2})$/,"$1-$2");
}
function safeProfile(value){
 if(!value||typeof value!=="object"||!Array.isArray(value.keywords))return null;
 return {
  cnpj:core.cleanCnpj(value.cnpj),name:String(value.name||"Empresa consultada").slice(0,180),
  legalName:String(value.legalName||"").slice(0,180),uf:String(value.uf||"").slice(0,2).toUpperCase(),
  city:String(value.city||"").slice(0,100),status:String(value.status||"").slice(0,80),
  primaryActivity:String(value.primaryActivity||"").slice(0,240),
  activities:Array.isArray(value.activities)?value.activities.map(v=>String(v).slice(0,240)).slice(0,12):[],
  manual:String(value.manual||"").slice(0,240),
  keywords:value.keywords.map(v=>String(v).slice(0,40)).filter(Boolean).slice(0,12)
 };
}
function saveProfile(profile){
 try{localStorage.setItem(STORAGE_KEY,JSON.stringify(profile));return true}catch{return false}
}
function loadProfile(){
 try{return safeProfile(JSON.parse(localStorage.getItem(STORAGE_KEY)||"null"))}catch{return null}
}
function forgetProfile(){
 try{localStorage.removeItem(STORAGE_KEY)}catch{}
 state.profile=null;
 $("company-fit-profile").hidden=true;
 $("company-fit-results-wrap").hidden=true;
 $("company-fit-cnpj").value="";
 $("company-fit-keywords").value="";
 $("company-fit-status").textContent="Perfil removido deste navegador.";
 clear($("company-fit-results"));
}
function status(message,type){
 const el=$("company-fit-status");
 el.textContent=message;
 el.className="company-fit-status"+(type?" "+type:"");
}
function setBusy(busy){
 state.busy=busy;
 $("company-fit-submit").disabled=busy;
 $("company-fit-refresh").disabled=busy;
 $("company-fit-submit").textContent=busy?"Analisando empresa...":"Encontrar oportunidades →";
}
function renderProfile(profile){
 const box=$("company-fit-profile");
 box.hidden=false;
 $("company-fit-name").textContent=profile.name||"Empresa consultada";
 const location=[profile.city,profile.uf].filter(Boolean).join(" / ");
 const details=[];
 if(location)details.push(location);
 if(profile.status)details.push("Situação cadastral: "+profile.status);
 $("company-fit-meta").textContent=details.join(" · ")||"Perfil criado pelas informações fornecidas.";
 $("company-fit-activity").textContent=profile.primaryActivity||profile.manual||"Atividade não identificada automaticamente.";
 const tags=$("company-fit-tags");clear(tags);
 for(const word of profile.keywords.slice(0,8))tags.append(node("span","company-fit-tag",word));
 $("company-fit-refresh").hidden=!profile.keywords.length;
}
async function lookupCnpj(cnpj,signal){
 const response=await fetch(CNPJ_API+encodeURIComponent(cnpj),{signal,headers:{"Accept":"application/json"},cache:"no-store"});
 if(!response.ok){
  if(response.status===404)throw new Error("CNPJ não encontrado na consulta pública.");
  if(response.status===400)throw new Error("Confira o CNPJ informado.");
  throw new Error("A consulta de CNPJ está temporariamente indisponível.");
 }
 const data=await response.json();
 if(!data||typeof data!=="object")throw new Error("A consulta de CNPJ retornou dados inesperados.");
 return data;
}
async function fetchMatches(query,signal){
 const response=await fetch(API+"/rpc/editalume_search",{
  method:"POST",signal,cache:"no-store",
  headers:{"apikey":KEY,"Content-Type":"application/json"},
  body:JSON.stringify({
   p_q:query.q,p_uf:query.uf,p_city:null,p_focus:null,p_days:null,p_min_value:null,
   p_sort:"deadline",p_limit:5,p_offset:0
  })
 });
 if(!response.ok)throw new Error("Falha na base nacional ("+response.status+").");
 const rows=await response.json();
 return Array.isArray(rows)?rows:[];
}
async function searchCompany(profile){
 if(!profile?.keywords?.length){
  status("Não consegui extrair palavras-chave suficientes. Descreva o que sua empresa vende no campo acima.","warning");
  return;
 }
 if(state.controller)state.controller.abort();
 const controller=new AbortController();state.controller=controller;
 setBusy(true);
 status("Cruzando a atividade da empresa com a base de oportunidades...");
 $("company-fit-results-wrap").hidden=false;
 $("company-fit-result-count").textContent="Buscando melhores correspondências...";
 clear($("company-fit-results"));
 try{
  const queries=core.buildQueries(profile);
  if(!queries.length)throw new Error("Adicione palavras-chave mais específicas para buscar oportunidades.");
  const byId=new Map();
  let successful=0;
  for(const query of queries){
   if(controller.signal.aborted)return;
   try{
    const rows=await fetchMatches(query,controller.signal);
    successful+=1;
    for(const row of rows){
     const url=core.officialPncpUrl(row);
     if(!url||Date.parse(row.closing_at)<=Date.now())continue;
     const current=byId.get(row.pncp_id)||{row,terms:new Set()};
     current.terms.add(query.q);
     byId.set(row.pncp_id,current);
    }
   }catch(error){
    if(error.name==="AbortError")return;
   }
  }
  if(!successful)throw new Error("Não foi possível consultar a base nacional agora.");
  const ranked=[...byId.values()].map(entry=>{
   const fit=core.scoreOpportunity(entry.row,profile,[...entry.terms]);
   return {...entry.row,_fit:fit};
  }).sort((a,b)=>b._fit.score-a._fit.score||Date.parse(a.closing_at)-Date.parse(b.closing_at)).slice(0,5);
  renderMatches(ranked);
  if(ranked.length){
   status("Compatibilidade calculada pela atividade e localização. É uma triagem indicativa; confirme requisitos e habilitação no edital oficial.","success");
  }else{
   status("Não encontrei correspondências fortes nesta amostra. Tente acrescentar palavras mais específicas sobre o que sua empresa vende.","warning");
  }
 }catch(error){
  if(error.name==="AbortError")return;
  $("company-fit-result-count").textContent="Não foi possível concluir a busca";
  status(error.message||"Falha temporária na análise.","error");
 }finally{
  if(state.controller===controller){state.controller=null;setBusy(false)}
 }
}
function renderMatches(items){
 const root=$("company-fit-results");clear(root);
 $("company-fit-result-count").textContent=items.length
  ?items.length+(items.length===1?" oportunidade priorizada":" oportunidades priorizadas")
  :"Nenhuma oportunidade priorizada";
 for(const row of items){
  const fit=row._fit;
  const card=node("article","company-match-card");
  const main=node("div","company-match-main");
  const top=node("div","company-match-top");
  const badge=node("span","company-match-score",fit.score+"% · "+core.fitLabel(fit.score));
  const place=node("span","company-match-place",[row.municipality,row.uf].filter(Boolean).join(" / "));
  top.append(badge,place);
  main.append(top,node("h3",null,row.title),node("p","company-match-agency",row.agency||"Órgão não informado"));
  const reasons=node("ul","company-match-reasons");
  for(const reason of fit.reasons.slice(0,3))reasons.append(node("li",null,reason));
  main.append(reasons);
  const side=node("aside","company-match-side");
  side.append(node("span","company-match-label","PRAZO INFORMADO"),node("strong",null,dt.format(new Date(row.closing_at))),
   node("span","company-match-label","VALOR ESTIMADO"),node("strong",null,row.estimated_value_brl>0?money.format(Number(row.estimated_value_brl)):"Não informado"));
  const a=node("a","company-match-link","Conferir edital no PNCP ↗");
  a.href=core.officialPncpUrl(row);a.target="_blank";a.rel="noopener noreferrer";
  side.append(a);card.append(main,side);root.append(card);
 }
}
async function submit(event){
 event?.preventDefault();
 const rawCnpj=$("company-fit-cnpj").value;
 const cnpj=core.cleanCnpj(rawCnpj);
 const manual=$("company-fit-keywords").value.trim();
 if(!cnpj&&!manual){
  status("Informe o CNPJ ou descreva o que sua empresa vende.","error");return;
 }
 if(cnpj&&!core.validCnpj(cnpj)){
  status("Esse CNPJ não passou na validação dos dígitos verificadores.","error");return;
 }
 if(state.controller)state.controller.abort();
 const controller=new AbortController();state.controller=controller;
 setBusy(true);status(cnpj?"Consultando o cadastro público da empresa...":"Criando perfil pelas palavras-chave informadas...");
 try{
  let profile;
  if(cnpj){
   const timeout=setTimeout(()=>controller.abort(),10000);
   try{
    const data=await lookupCnpj(cnpj,controller.signal);
    profile=core.buildProfile(data,manual);
   }finally{clearTimeout(timeout)}
  }else profile=core.buildManualProfile(manual);
  if(!profile.keywords.length)throw new Error("Não consegui identificar termos úteis. Descreva produtos ou serviços específicos.");
  state.profile=profile;saveProfile(profile);renderProfile(profile);
  status("Perfil criado. Agora estou priorizando oportunidades para esta empresa...");
  state.controller=null;setBusy(false);
  await searchCompany(profile);
 }catch(error){
  if(error.name==="AbortError"){
   status("A consulta demorou mais que o esperado. Você pode usar somente as palavras-chave e tentar novamente.","warning");
  }else if(manual){
   const profile=core.buildManualProfile(manual);
   if(profile.keywords.length){
    state.profile=profile;saveProfile(profile);renderProfile(profile);
    status("Não consegui consultar o CNPJ, então usei sua descrição manual.","warning");
    state.controller=null;setBusy(false);
    await searchCompany(profile);return;
   }
   status(error.message||"Não foi possível criar o perfil.","error");
  }else status(error.message||"Não foi possível criar o perfil.","error");
 }finally{
  if(state.controller===controller)state.controller=null;
  if(!state.controller)setBusy(false);
 }
}
function init(){
 if(!$("company-fit-form"))return;
 $("company-fit-cnpj").addEventListener("input",event=>{event.target.value=formatCnpj(event.target.value)});
 $("company-fit-form").addEventListener("submit",submit);
 $("company-fit-refresh").addEventListener("click",()=>state.profile&&searchCompany(state.profile));
 $("company-fit-forget").addEventListener("click",forgetProfile);
 const saved=loadProfile();
 if(saved){
  state.profile=saved;renderProfile(saved);
  $("company-fit-cnpj").value=saved.cnpj?formatCnpj(saved.cnpj):"";
  $("company-fit-keywords").value=saved.manual||"";
  status("Perfil recuperado deste navegador. Toque em “Atualizar oportunidades” para consultar a base.");
 }
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();