/* Editalume: structured PNCP summary + cited textual PDF evidence. */
(()=>{
"use strict";
const ENDPOINT="https://jhxhbgprjqppzfrjdfvj.supabase.co/functions/v1/editalume-pncp-document";
const core=window.EditalumeTenderAnalysisCore;
if(!core)return;
const money=new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL",maximumFractionDigits:0});
const dt=new Intl.DateTimeFormat("pt-BR",{dateStyle:"short",timeStyle:"short",timeZone:"America/Sao_Paulo"});
let overlay=null,panel=null,body=null,lastFocus=null,current=null,pdfLibPromise=null;

function node(tag,cls,text){const el=document.createElement(tag);if(cls)el.className=cls;if(text!==undefined)el.textContent=String(text);return el}
function clear(el){el.replaceChildren()}
function fmtDate(value){const d=new Date(value);return Number.isFinite(d.getTime())?dt.format(d):"Não informado"}
function fmtMoney(value){const n=Number(value);return Number.isFinite(n)&&n>0?money.format(n):"Não informado"}
function yesNo(value){return value===true?"Sim":value===false?"Não":"Não informado"}
function ensureModal(){
 if(overlay)return;
 overlay=node("div","tender-analysis-overlay");overlay.hidden=true;
 overlay.setAttribute("role","dialog");overlay.setAttribute("aria-modal","true");overlay.setAttribute("aria-labelledby","tender-analysis-title");
 panel=node("section","tender-analysis-panel");
 const head=node("header","tender-analysis-head"),left=node("div");
 left.append(node("div","tender-analysis-eyebrow","LEITURA DO EDITAL · BETA"),node("h2",null,"Análise da oportunidade"));
 left.querySelector("h2").id="tender-analysis-title";
 const close=node("button","tender-analysis-close","✕");close.type="button";close.setAttribute("aria-label","Fechar análise");
 close.addEventListener("click",closeModal);
 head.append(left,close);body=node("div","tender-analysis-body");panel.append(head,body);overlay.append(panel);document.body.append(overlay);
 overlay.addEventListener("click",event=>{if(event.target===overlay)closeModal()});
 document.addEventListener("keydown",event=>{if(event.key==="Escape"&&!overlay.hidden)closeModal()});
}
function closeModal(){
 if(!overlay)return;overlay.hidden=true;document.documentElement.style.overflow="";current=null;
 if(lastFocus&&typeof lastFocus.focus==="function")lastFocus.focus();
}
function endpoint(params){const u=new URL(ENDPOINT);for(const [k,v] of Object.entries(params))if(v!==null&&v!==undefined)u.searchParams.set(k,String(v));return u.toString()}
async function metadata(pncpId){
 const response=await fetch(endpoint({action:"metadata",pncp_id:pncpId}),{cache:"no-store"});
 const data=await response.json().catch(()=>null);
 if(!response.ok||!data?.ok)throw new Error(data?.error||"Não foi possível consultar os dados oficiais agora.");
 return data;
}
function sourceLink(label,url){
 if(!url)return node("span",null,label);
 const a=node("a",null,label);a.href=url;a.target="_blank";a.rel="noopener noreferrer";return a;
}
function kpi(label,value){const el=node("div","tender-kpi");el.append(node("span",null,label),node("strong",null,value||"Não informado"));return el}
function renderMetadata(payload,row){
 const detail=core.normalizeDetail(payload.detail,row),docs=core.rankDocuments(core.normalizeDocuments(payload.documents));
 current={row,detail,docs};
 clear(body);
 const official=core.officialNoticeUrl(detail.pncpId||row.pncp_id||row.id);
 const object=node("div","tender-analysis-object");
 object.append(node("span",null,"OBJETO PUBLICADO"),node("p",null,detail.object||"Objeto não informado."));
 body.append(object);

 const summary=node("div","tender-analysis-summary");
 summary.append(
  kpi("ÓRGÃO",detail.agency||"Não informado"),
  kpi("MODALIDADE",detail.modality||"Não informado"),
  kpi("FIM DAS PROPOSTAS",fmtDate(detail.endAt)),
  kpi("VALOR ESTIMADO",fmtMoney(detail.estimatedValue)),
  kpi("PROCESSO",detail.process||detail.purchaseNumber||"Não informado"),
  kpi("MODO DE DISPUTA",detail.disputeMode||"Não informado"),
  kpi("SRP",yesNo(detail.srp)),
  kpi("AMPARO LEGAL",detail.legalBasis||"Consultar fonte")
 );
 body.append(summary);
 const structuredSource=node("div","tender-source-note");
 structuredSource.append(sourceLink("Fonte: PNCP · dados da contratação",official));
 body.append(structuredSource);

 const docsSection=node("section","tender-analysis-section");
 const docsHead=node("div","tender-analysis-section-head"),docsTitle=node("h3",null,"Documentos oficiais");
 docsHead.append(docsTitle,node("p",null,docs.length?docs.length+" anexo(s) publicado(s) nesta contratação.":"Nenhum anexo foi retornado pela API oficial."));
 docsSection.append(docsHead);
 const list=node("div","tender-documents");
 for(const doc of docs){
  const item=node("div","tender-document"),main=node("div","tender-document-main");
  main.append(node("strong",null,doc.title),node("span",null,doc.type+(doc.publishedAt?" · publicado em "+fmtDate(doc.publishedAt):"")));
  item.append(main,sourceLink("Abrir fonte ↗",doc.url));list.append(item);
 }
 docsSection.append(list);body.append(docsSection);

 const deep=node("section","tender-analysis-section"),deepHead=node("div","tender-analysis-section-head");
 deepHead.append(node("h3",null,"Exigências e pontos de atenção"),node("p",null,"Leitura textual com referência de página. PDFs escaneados podem não ter texto extraível."));
 deep.append(deepHead);
 const card=node("div","tender-deep-card");
 const eligible=docs.filter(d=>d.isPdf&&d.url).slice(0,2);
 card.append(node("p",null,eligible.length
  ?"O Editalume pode ler até dois documentos prioritários e localizar trechos relevantes. A ausência de um trecho não prova que a exigência não exista."
  :"Não encontrei PDF textual claramente identificável para leitura automática. Você ainda pode abrir os anexos oficiais acima."));
 if(eligible.length){
  const button=node("button","tender-deep-action","Ler PDFs e localizar exigências →");button.type="button";
  const status=node("p","tender-deep-status","");
  const results=node("div","tender-evidence");
  button.addEventListener("click",()=>analyzeDocuments(eligible,button,status,results));
  card.append(button,status,results);
 }
 deep.append(card);body.append(deep);

 const disclaimer=node("p","tender-analysis-disclaimer",
  "Leitura assistida e determinística, não parecer jurídico. O Editalume destaca dados e trechos encontrados nas fontes oficiais; sempre leia o edital e seus anexos integralmente antes de participar.");
 body.append(disclaimer);
}
async function loadPdfLib(){
 if(!pdfLibPromise){
  pdfLibPromise=import("https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.min.mjs").then(lib=>{
   lib.GlobalWorkerOptions.workerSrc="https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs";
   return lib;
  });
 }
 return pdfLibPromise;
}
async function documentBytes(pncpId,sequence){
 const response=await fetch(endpoint({action:"document",pncp_id:pncpId,document_sequence:sequence}),{cache:"force-cache"});
 if(!response.ok){
  const data=await response.json().catch(()=>null);
  throw new Error(data?.error||"Não foi possível abrir este PDF.");
 }
 return response.arrayBuffer();
}
async function pdfPages(buffer,maxPages){
 const lib=await loadPdfLib(),task=lib.getDocument({data:new Uint8Array(buffer)});
 const pdf=await task.promise,totalPages=pdf.numPages,pages=[],limit=Math.min(totalPages,maxPages);
 try{
  for(let i=1;i<=limit;i++){
   const page=await pdf.getPage(i),content=await page.getTextContent();
   pages.push({page:i,text:content.items.map(item=>item.str||"").join(" ")});
  }
 }finally{await pdf.destroy()}
 return {pages,totalPages,truncated:totalPages>limit};
}
function renderEvidence(all,container,notes){
 clear(container);
 const summary=core.evidenceSummary(all);
 if(summary.length){
  const chips=node("div","tender-evidence-summary");
  for(const item of summary)chips.append(node("span","tender-evidence-chip",item.label+" · "+item.count));
  container.append(chips);
 }
 for(const item of all){
  const wrap=node("article","tender-evidence-item");
  wrap.append(node("h4",null,item.label),node("p",null,item.snippet));
  const citation=node("div","tender-evidence-citation");
  citation.append(node("span",null,item.source+" · p. "+item.page));
  if(item.sourceUrl){
   const u=new URL(item.sourceUrl);u.hash="page="+item.page;
   citation.append(sourceLink("Abrir página na fonte ↗",u.toString()));
  }
  wrap.append(citation);container.append(wrap);
 }
 if(!all.length)container.append(node("p","tender-deep-status","Nenhum dos padrões desta versão foi localizado no texto extraído. Isso não significa ausência da exigência."));
 for(const note of notes)container.append(node("p","tender-deep-status",note));
}
async function analyzeDocuments(docs,button,status,results){
 if(!current)return;
 button.disabled=true;status.textContent="Preparando leitura dos documentos oficiais...";
 const evidence=[],notes=[],pncpId=current.detail.pncpId||current.row.pncp_id||current.row.id;
 try{
  let done=0;
  for(const doc of docs){
   status.textContent="Lendo "+doc.title+"...";
   try{
    const buffer=await documentBytes(pncpId,doc.sequence);
    const parsed=await pdfPages(buffer,60);
    const textSize=parsed.pages.reduce((sum,p)=>sum+p.text.trim().length,0);
    if(textSize<300){
     notes.push(doc.title+": pouco ou nenhum texto extraível; o arquivo pode estar escaneado.");
     continue;
    }
    evidence.push(...core.extractEvidence(parsed.pages,doc));
    if(parsed.truncated)notes.push(doc.title+": leitura limitada às primeiras 60 de "+parsed.totalPages+" páginas.");
    done+=1;
   }catch(error){notes.push(doc.title+": "+(error?.message||"não foi possível ler este arquivo."))}
  }
  renderEvidence(evidence,results,notes);
  status.textContent=done
   ?"Leitura concluída. Cada trecho abaixo informa documento e página."
   :"Os PDFs disponíveis não puderam ser lidos automaticamente nesta versão.";
 }catch(error){
  status.textContent=error?.message||"Não foi possível concluir a leitura documental.";
 }finally{button.disabled=false}
}
async function open(row,trigger){
 ensureModal();lastFocus=trigger||document.activeElement;overlay.hidden=false;document.documentElement.style.overflow="hidden";
 const pncpId=row?.pncp_id||row?.id;
 if(!core.parsePncpId(pncpId)){
  clear(body);body.append(node("div","tender-analysis-error","Este registro não possui um controle PNCP válido para análise."));return;
 }
 // Render the validated Editalume record immediately; PNCP enriches it in place.
 renderMetadata({detail:{numeroControlePNCP:pncpId},documents:[]},row);
 const loading=node("p","tender-deep-status","Atualizando dados e anexos diretamente do PNCP...");
 body.prepend(loading);
 panel.scrollTop=0;
 try{
  const payload=await metadata(pncpId);
  if(current?.row===row)renderMetadata(payload,row);
 }catch(error){
  if(current?.row===row){
   loading.textContent=(error?.message||"PNCP temporariamente indisponível.")+" O resumo acima usa o último registro validado pelo Editalume.";
   body.prepend(loading);
  }
 }
}
window.EditalumeTenderAnalysis={open,close:closeModal};
})();