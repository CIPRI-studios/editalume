/* Editalume company-fit core.
   Pure helpers shared by the browser UI and Node tests. */
(function(root,factory){
  const api=factory();
  if(typeof module==="object"&&module.exports)module.exports=api;
  else root.EditalumeCompanyFitCore=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
"use strict";

const STOPWORDS=new Set([
 "comercio","comercial","varejista","varejo","atacadista","atacado","servico","servicos","atividade","atividades",
 "outras","outros","outra","outro","nao","especificado","especificados","anteriormente","principal","secundaria","secundarias",
 "para","com","sem","sobre","entre","pela","pelo","pelas","pelos","das","dos","da","do","de","em","e","ou","por","um","uma",
 "uso","geral","diversos","diversas","especializado","especializada","especializados","especializadas","produtos","produto"
]);

function norm(value){
 return String(value??"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
}
function cleanCnpj(value){return String(value??"").replace(/\D/g,"").slice(0,14)}
function validCnpj(value){
 const c=cleanCnpj(value);
 if(c.length!==14||/^(\d)\1{13}$/.test(c))return false;
 const calc=(base,weights)=>{
   let sum=0;
   for(let i=0;i<weights.length;i++)sum+=Number(base[i])*weights[i];
   const r=sum%11;
   return r<2?0:11-r;
 };
 const d1=calc(c,[5,4,3,2,9,8,7,6,5,4,3,2]);
 const d2=calc(c,[6,5,4,3,2,9,8,7,6,5,4,3,2]);
 return d1===Number(c[12])&&d2===Number(c[13]);
}
function tokens(value){
 return norm(value).replace(/[^a-z0-9\s-]/g," ").split(/[\s-]+/).filter(Boolean);
}
function canonical(token){
 const t=norm(token);
 const aliases=[
  [/^hospital/,"hospitalar"],[/^medic/,"medico"],[/^cirurg/,"cirurgico"],[/^odont/,"odontologico"],[/^laborat/,"laboratorio"],
  [/^farmac/,"farmaceutico"],[/^limpez/,"limpeza"],[/^higien/,"higiene"],[/^conserv/,"conservacao"],[/^manut/,"manutencao"],
  [/^constr/,"construcao"],[/^engenh/,"engenharia"],[/^informat/,"informatica"],[/^tecnolog/,"tecnologia"],[/^softw/,"software"],
  [/^equip/,"equipamento"],[/^materi/,"material"],[/^aliment/,"alimento"],[/^refeic/,"refeicao"],[/^jardin/,"jardinagem"],
  [/^portar/,"portaria"],[/^vigil/,"vigilancia"],[/^eletr/,"eletrico"],[/^hidraul/,"hidraulico"],[/^transport/,"transporte"],
  [/^logist/,"logistica"],[/^mobili/,"mobiliario"],[/^uniform/,"uniforme"],[/^descart/,"descartavel"],[/^instrument/,"instrumento"],
  [/^segur/,"seguranca"],[/^obra/,"obra"],[/^paviment/,"pavimentacao"],[/^combust/,"combustivel"],[/^veicul/,"veiculo"]
 ];
 for(const [pattern,value] of aliases)if(pattern.test(t))return value;
 return t;
}
function keywordScore(word,manual){
 let score=manual?100:0;
 const strong=/^(hospitalar|medico|cirurgico|odontologico|laboratorio|farmaceutico|limpeza|higiene|conservacao|manutencao|construcao|engenharia|informatica|tecnologia|software|equipamento|material|alimento|refeicao|jardinagem|portaria|vigilancia|eletrico|hidraulico|transporte|logistica|mobiliario|uniforme|descartavel|instrumento|seguranca|obra|pavimentacao|combustivel|veiculo|epi)$/;
 if(strong.test(word))score+=25;
 score+=Math.min(word.length,14);
 return score;
}
function keywordsFromActivities(activities,manualText){
 const ranked=new Map();
 const push=(raw,isManual)=>{
  for(const rawToken of tokens(raw)){
   const word=canonical(rawToken);
   if((word.length<4&&word!=="epi")||STOPWORDS.has(word)||/^\d+$/.test(word))continue;
   const current=ranked.get(word)||{word,score:0,count:0,manual:false};
   current.count+=1;current.manual=current.manual||isManual;
   current.score=Math.max(current.score,keywordScore(word,current.manual))+Math.min(current.count,4)*3;
   ranked.set(word,current);
  }
 };
 String(manualText??"").split(/[,;|]/).forEach(v=>push(v,true));
 (Array.isArray(activities)?activities:[]).forEach(v=>push(v,false));
 return [...ranked.values()].sort((a,b)=>b.score-a.score||b.count-a.count||a.word.localeCompare(b.word,"pt-BR")).map(x=>x.word).slice(0,12);
}
function buildProfile(data,manualText){
 const secondaries=Array.isArray(data?.cnaes_secundarios)?data.cnaes_secundarios.map(x=>x?.descricao).filter(Boolean):[];
 const activities=[data?.cnae_fiscal_descricao,...secondaries].filter(Boolean);
 const manual=String(manualText??"").trim();
 const keywords=keywordsFromActivities(activities,manual);
 return {
  cnpj:cleanCnpj(data?.cnpj),
  name:String(data?.nome_fantasia||data?.razao_social||"Empresa consultada").trim(),
  legalName:String(data?.razao_social||"").trim(),
  uf:String(data?.uf||"").trim().toUpperCase(),
  city:String(data?.municipio||"").trim(),
  status:String(data?.descricao_situacao_cadastral||"").trim(),
  primaryActivity:String(data?.cnae_fiscal_descricao||"").trim(),
  activities:activities.slice(0,12),
  manual,
  keywords
 };
}
function buildManualProfile(manualText){
 const manual=String(manualText??"").trim();
 return {cnpj:"",name:"Perfil manual",legalName:"",uf:"",city:"",status:"",primaryActivity:"",activities:[],manual,keywords:keywordsFromActivities([],manual)};
}
function buildQueries(profile){
 const words=(profile?.keywords||[]).slice(0,4);
 const seen=new Set(),queries=[];
 const add=(q,uf)=>{
  if(!q)return;
  const key=q+"|"+(uf||"");
  if(seen.has(key))return;
  seen.add(key);queries.push({q,uf:uf||null});
 };
 const uf=profile?.uf||null;
 for(const w of words.slice(0,3))add(w,uf);
 for(const w of words.slice(0,2))add(w,null);
 return queries.slice(0,5);
}
function opportunityText(row){return norm([row?.title,row?.agency,row?.municipality,row?.modality].filter(Boolean).join(" "))}
function scoreOpportunity(row,profile,matchedTerms){
 const text=opportunityText(row);
 const profileWords=(profile?.keywords||[]).slice(0,10);
 const matches=profileWords.filter(w=>text.includes(norm(w)));
 const matched=[...new Set([...(matchedTerms||[]).map(norm),...matches])].filter(Boolean);
 let score=matched.length?35+Math.min(35,matched.length*12):15;
 if(profile?.uf&&row?.uf===profile.uf)score+=15;
 if(profile?.city&&norm(row?.municipality)===norm(profile.city))score+=10;
 if(row?.sector_focus)score+=5;
 score=Math.max(0,Math.min(score,95));
 const reasons=[];
 if(matched.length)reasons.push("Objeto relacionado a "+matched.slice(0,2).join(" / "));
 if(profile?.uf&&row?.uf===profile.uf)reasons.push("Mesmo estado da empresa");
 if(profile?.city&&norm(row?.municipality)===norm(profile.city))reasons.push("Mesmo município da empresa");
 if(row?.sector_focus)reasons.push("Setor já monitorado pelo Editalume");
 if(!reasons.length)reasons.push("Resultado associado às palavras-chave do perfil");
 return {score,reasons,matched};
}
function fitLabel(score){
 if(score>=80)return "Alta compatibilidade";
 if(score>=60)return "Boa compatibilidade";
 return "Compatibilidade possível";
}
function officialPncpUrl(row){
 const m=/^(\d{14})-\d+-(\d+)\/(\d{4})$/.exec(row?.pncp_id||"");
 if(!m||Number(m[2])<1)return null;
 return "https://pncp.gov.br/app/editais/"+m[1]+"/"+m[3]+"/"+Number(m[2]);
}
return {norm,cleanCnpj,validCnpj,keywordsFromActivities,buildProfile,buildManualProfile,buildQueries,scoreOpportunity,fitLabel,officialPncpUrl};
});