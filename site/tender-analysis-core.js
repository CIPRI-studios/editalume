/* Editalume tender analysis helpers.
   Deterministic extraction only: no claim should be inferred when no source is found. */
(function(root,factory){
  const api=factory();
  if(typeof module==="object"&&module.exports)module.exports=api;
  else root.EditalumeTenderAnalysisCore=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
"use strict";

function norm(value){
 return String(value??"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
}
function parsePncpId(value){
 const m=/^(\d{14})-\d+-(\d+)\/(\d{4})$/.exec(String(value||"").trim());
 if(!m)return null;
 const sequence=Number(m[2]),year=Number(m[3]);
 if(!Number.isSafeInteger(sequence)||sequence<1||year<2000||year>2200)return null;
 return {cnpj:m[1],sequence,year,pncpId:String(value).trim()};
}
function first(...values){
 for(const value of values){
  if(value!==null&&value!==undefined&&String(value).trim()!=="")return value;
 }
 return null;
}
function path(obj,...keys){
 let cur=obj;
 for(const key of keys){if(cur==null)return null;cur=cur[key]}
 return cur??null;
}
function normalizeDetail(raw,row){
 const d=raw&&typeof raw==="object"?raw:{};
 const fallback=row&&typeof row==="object"?row:{};
 return {
  pncpId:first(d.numeroControlePNCP,fallback.pncp_id,fallback.id),
  object:first(d.objetoCompra,d.objeto,fallback.title,fallback.object),
  agency:first(path(d,"orgaoEntidade","razaoSocial"),path(d,"unidadeOrgao","nomeUnidade"),d.orgaoCompra,fallback.agency,fallback.organ),
  process:first(d.processo,d.numeroProcesso),
  purchaseNumber:first(d.numeroCompra,d.numeroAvisoEdital),
  modality:first(d.modalidadeNome,path(d,"modalidade","nome"),fallback.modality),
  disputeMode:first(d.modoDisputaNome,path(d,"modoDisputa","nome")),
  legalBasis:first(path(d,"amparoLegal","nome"),d.amparoLegalNome,d.normativoLegal),
  startAt:first(d.dataAberturaProposta,d.dataInicioRecebimentoPropostas,d.dataPublicacaoPncp),
  endAt:first(d.dataEncerramentoProposta,d.dataFimRecebimentoPropostas,fallback.closing_at,fallback.deadline),
  estimatedValue:first(d.valorTotalEstimado,d.valorEstimadoTotal,fallback.estimated_value_brl),
  homologatedValue:first(d.valorTotalHomologado),
  srp:first(d.srp,d.sistemaRegistroPrecos),
  additional:first(d.informacaoComplementar,d.informacaoComplementarCompra),
  updatedAt:first(d.dataAtualizacao,d.dataAtualizacaoGlobal,fallback.last_observed_at),
  municipality:first(path(d,"unidadeOrgao","municipioNome"),d.municipioNome,fallback.municipality,fallback.city),
  uf:first(path(d,"unidadeOrgao","ufSigla"),d.ufSigla,fallback.uf)
 };
}
function safeUrl(value){
 try{
  const u=new URL(String(value||""));
  if(u.protocol!=="https:")return null;
  return u.toString();
 }catch{return null}
}
function normalizeDocuments(raw){
 const list=Array.isArray(raw)?raw:Array.isArray(raw?.documentos)?raw.documentos:[];
 return list.map(doc=>{
  const title=String(doc?.titulo||doc?.nome||"Documento oficial").trim().slice(0,220);
  const type=String(doc?.tipoDocumentoNome||"Documento").trim().slice(0,120);
  const url=safeUrl(doc?.url),label=norm(type+" "+title),rawUrl=String(doc?.url||"");
  const explicitArchive=/\.(?:zip|rar|7z)(?:$|[?#])/i.test(rawUrl)||/\b(?:zip|arquivo compactado)\b/i.test(label);
  const likelyPdf=/\.pdf(?:$|[?#])/i.test(rawUrl)||/\bpdf\b/i.test(label)||
   /edital|instrumento convocatorio|termo de referencia|projeto basico|estudo tecnico preliminar|\betp\b/.test(label);
  return {
   sequence:Number(doc?.sequencialDocumento),title,type,publishedAt:doc?.dataPublicacaoPncp||null,url,
   isPdf:!explicitArchive&&likelyPdf
  };
 }).filter(doc=>Number.isSafeInteger(doc.sequence)&&doc.sequence>0);
}
function documentPriority(doc){
 const t=norm((doc?.type||"")+" "+(doc?.title||""));
 let score=0;
 if(/edital|instrumento convocatorio/.test(t))score+=100;
 if(/termo de referencia|termo referencia/.test(t))score+=90;
 if(/projeto basico/.test(t))score+=80;
 if(/estudo tecnico preliminar|\betp\b/.test(t))score+=70;
 if(/anexo/.test(t))score+=20;
 if(doc?.isPdf)score+=15;
 return score;
}
function rankDocuments(docs){
 return [...(Array.isArray(docs)?docs:[])].sort((a,b)=>documentPriority(b)-documentPriority(a)||a.sequence-b.sequence);
}
const EVIDENCE_GROUPS=[
 {id:"habilitacao",label:"Habilitação e documentos",keywords:[
  "documentos de habilitacao","habilitacao juridica","regularidade fiscal","regularidade trabalhista",
  "qualificacao tecnica","qualificacao economico-financeira","atestado de capacidade","balanco patrimonial",
  "certidao negativa","cndt","fgts"
 ]},
 {id:"visita",label:"Visita técnica / vistoria",keywords:["visita tecnica","vistoria tecnica","vistoria previa","visita ao local"]},
 {id:"amostra",label:"Amostra / prova de conceito",keywords:["apresentacao de amostra","amostra do produto","prova de conceito","demonstracao tecnica"]},
 {id:"garantia",label:"Garantias",keywords:["garantia da proposta","garantia contratual","seguro-garantia","caucao"]},
 {id:"pagamento",label:"Pagamento",keywords:["prazo para pagamento","condicoes de pagamento","pagamento sera efetuado","pagamento em ate"]},
 {id:"execucao",label:"Entrega / execução",keywords:["prazo de entrega","prazo de execucao","local de entrega","local de execucao","inicio da execucao"]},
 {id:"sancoes",label:"Sanções e penalidades",keywords:["sancoes administrativas","penalidades","aplicacao de multa","multa de mora","impedimento de licitar"]}
];
function snippetAround(text,index){
 const clean=String(text||"").replace(/\s+/g," ").trim();
 if(!clean)return "";
 const start=Math.max(0,index-150),end=Math.min(clean.length,index+330);
 let out=clean.slice(start,end).trim();
 if(start>0)out="…"+out;
 if(end<clean.length)out+="…";
 return out;
}
function extractEvidence(pages,document){
 const sourceTitle=String(document?.title||document?.type||"Documento oficial");
 const evidence=[];
 for(const group of EVIDENCE_GROUPS){
  let found=0;
  for(const page of Array.isArray(pages)?pages:[]){
   if(found>=2)break;
   const raw=String(page?.text||"").replace(/\s+/g," ").trim();
   if(!raw)continue;
   const normalized=norm(raw);
   let hitIndex=-1,hitTerm="";
   for(const keyword of group.keywords){
    const idx=normalized.indexOf(keyword);
    if(idx>=0){hitIndex=idx;hitTerm=keyword;break}
   }
   if(hitIndex<0)continue;
   evidence.push({
    category:group.id,label:group.label,page:Number(page?.page)||null,
    source:sourceTitle,sourceUrl:document?.url||null,term:hitTerm,
    snippet:snippetAround(raw,hitIndex)
   });
   found+=1;
  }
 }
 return evidence;
}
function evidenceSummary(evidence){
 const groups=new Map();
 for(const item of Array.isArray(evidence)?evidence:[]){
  if(!groups.has(item.category))groups.set(item.category,{label:item.label,count:0});
  groups.get(item.category).count+=1;
 }
 return [...groups.values()];
}
function officialNoticeUrl(pncpId){
 const p=parsePncpId(pncpId);if(!p)return null;
 return "https://pncp.gov.br/app/editais/"+p.cnpj+"/"+p.year+"/"+p.sequence;
}
function sameText(a,b){return norm(a).trim()&&norm(a).trim()===norm(b).trim()}
function uniqueEvidence(evidence,category){
 return (Array.isArray(evidence)?evidence:[]).filter(x=>x?.category===category);
}
function participationDecision(detail,row,profile,evidence,nowMs){
 const p=profile&&typeof profile==="object"?profile:null;
 const words=Array.isArray(p?.keywords)?p.keywords.map(norm).filter(Boolean).slice(0,10):[];
 if(!words.length){
  return {
   available:false,score:null,label:"Crie o perfil da empresa",tone:"neutral",stage:"profile_missing",
   positives:[],cautions:["Use seu CNPJ ou descreva o que a empresa vende para calcular uma prioridade personalizada."]
  };
 }
 const d=detail&&typeof detail==="object"?detail:{},r=row&&typeof row==="object"?row:{};
 const text=norm([d.object,r.title,r.object,d.additional,d.agency,r.agency,r.organ].filter(Boolean).join(" "));
 const matched=words.filter(word=>text.includes(word));
 let score=35;
 const positives=[],cautions=[];
 if(matched.length>=3){score+=30;positives.push("Objeto muito alinhado ao perfil: "+matched.slice(0,3).join(", ")+".")}
 else if(matched.length===2){score+=24;positives.push("Objeto alinhado a "+matched.join(" e ")+".")}
 else if(matched.length===1){score+=15;positives.push("Há aderência ao termo “"+matched[0]+"”.")}
 else {score-=20;cautions.push("O objeto tem pouca aderência às palavras-chave do perfil cadastrado.");}

 const uf=String(d.uf||r.uf||"").toUpperCase(),city=d.municipality||r.municipality||r.city||"";
 if(p.uf&&uf&&String(p.uf).toUpperCase()===uf){score+=8;positives.push("A oportunidade está no mesmo estado da empresa.");}
 if(p.city&&city&&sameText(p.city,city)){score+=5;positives.push("A oportunidade está no mesmo município da empresa.");}

 const end=Date.parse(d.endAt||r.closing_at||r.deadline||"");
 const clock=Number.isFinite(Number(nowMs))?Number(nowMs):Date.now();
 if(Number.isFinite(end)){
  const days=(end-clock)/86400000;
  if(days>=7){score+=12;positives.push("Há pelo menos 7 dias até o encerramento das propostas.");}
  else if(days>=3){score+=6;positives.push("Ainda há alguns dias para preparar a proposta.");}
  else if(days>=1){score-=5;cautions.push("Prazo curto: menos de 3 dias para o encerramento.");}
  else if(days>=0){score-=15;cautions.push("Prazo crítico: menos de 24 horas para o encerramento.");}
  else {score=0;cautions.push("O prazo informado já encerrou.");}
 }

 const ev=Array.isArray(evidence)?evidence:[];
 const visit=uniqueEvidence(ev,"visita"),sample=uniqueEvidence(ev,"amostra"),guarantee=uniqueEvidence(ev,"garantia"),habil=uniqueEvidence(ev,"habilitacao");
 if(visit.length){score-=10;cautions.push("Foi localizado trecho sobre visita técnica/vistoria; confira a página citada.",visit[0]);}
 if(sample.length){score-=7;cautions.push("Foi localizado trecho sobre amostra ou prova de conceito; confira a página citada.",sample[0]);}
 if(guarantee.length){score-=6;cautions.push("Foi localizado trecho sobre garantia; confirme valor e condições na fonte.",guarantee[0]);}
 if(habil.length){
  const technical=habil.find(x=>/atestado de capacidade|qualificacao tecnica/.test(norm(x.snippet||"")));
  if(technical){score-=6;cautions.push("Foi localizada exigência relacionada à qualificação técnica/atestado; valide se sua empresa atende.",technical);}
  else cautions.push("Há trechos de habilitação documental para conferir antes de participar.",habil[0]);
 }
 score=Math.max(0,Math.min(95,Math.round(score)));
 const label=score>=75?"Boa candidata para avançar":score>=55?"Vale analisar com atenção":"Baixa prioridade por enquanto";
 const tone=score>=75?"good":score>=55?"attention":"low";
 return {
  available:true,score,label,tone,stage:ev.length?"documental":"preliminar",
  matched,positives,cautions
 };
}
return {norm,parsePncpId,normalizeDetail,normalizeDocuments,rankDocuments,extractEvidence,evidenceSummary,officialNoticeUrl,participationDecision};
});