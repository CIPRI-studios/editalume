/** Editalume PNCP read-only document bridge.
 * Public GET only. It never accepts arbitrary remote URLs: every upstream request
 * is derived from a validated PNCP control number and official document sequence.
 * verify_jwt=false because this is a public read-only endpoint with strict CORS,
 * target allowlisting, response-size caps and short-lived in-memory throttling. */
const ORIGINS=new Set([
 "https://caueccipriano.github.io",
 "https://cipri-studios.github.io",
 "http://127.0.0.1:4173",
 "http://localhost:4173"
]);
const PNCP_INTEGRATION="https://pncp.gov.br/api/pncp";\nconst PNCP_CONSULTA="https://pncp.gov.br/api/consulta";
const MAX_PDF_BYTES=12*1024*1024;
const WINDOW_MS=60_000,MAX_PER_WINDOW=40;
const buckets=new Map();

function cors(origin){
 return {
  "Access-Control-Allow-Origin":origin||"*",
  "Access-Control-Allow-Methods":"GET,OPTIONS",
  "Access-Control-Allow-Headers":"Content-Type",
  "Access-Control-Expose-Headers":"Content-Type,Content-Length,X-Editalume-Document-Title",
  "Vary":"Origin"
 };
}
function replyJson(data,status,origin,cache="public, max-age=300"){
 return new Response(JSON.stringify(data),{
  status,
  headers:{...cors(origin),"Content-Type":"application/json; charset=utf-8","Cache-Control":cache}
 });
}
function parsePncpId(value){
 const m=/^(\d{14})-\d+-(\d+)\/(\d{4})$/.exec(String(value||"").trim());
 if(!m)return null;
 const sequence=Number(m[2]),year=Number(m[3]);
 if(!Number.isSafeInteger(sequence)||sequence<1||year<2000||year>2200)return null;
 return {cnpj:m[1],sequence,year};
}
function ipOf(req){
 return (req.headers.get("cf-connecting-ip")||req.headers.get("x-real-ip")||
  (req.headers.get("x-forwarded-for")||"").split(",")[0].trim()||"unknown").slice(0,100);
}
function allowed(req){
 const now=Date.now(),key=ipOf(req),current=buckets.get(key);
 if(!current||now-current.at>WINDOW_MS){buckets.set(key,{at:now,count:1});return true}
 current.count+=1;return current.count<=MAX_PER_WINDOW;
}
async function fetchWithTimeout(url,init={}){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12_000);
 try{return await fetch(url,{...init,signal:controller.signal,redirect:"follow"})}
 finally{clearTimeout(timer)}
}
async function pncpJson(url){
 const response=await fetchWithTimeout(url,{headers:{"Accept":"application/json"}});
 if(!response.ok)throw new Error("PNCP_"+response.status);
 const data=await response.json();
 if(data===null||typeof data!=="object")throw new Error("PNCP_INVALID_JSON");
 return data;
}
function cleanDocs(raw){
 const list=Array.isArray(raw)?raw:Array.isArray(raw?.documentos)?raw.documentos:[];
 return list.map(doc=>({
  sequencialDocumento:Number(doc?.sequencialDocumento),
  url:typeof doc?.url==="string"?doc.url:null,
  tipoDocumentoId:Number(doc?.tipoDocumentoId)||null,
  tipoDocumentoNome:String(doc?.tipoDocumentoNome||"Documento").slice(0,120),
  titulo:String(doc?.titulo||"Documento oficial").slice(0,220),
  dataPublicacaoPncp:doc?.dataPublicacaoPncp||null
 })).filter(doc=>Number.isSafeInteger(doc.sequencialDocumento)&&doc.sequencialDocumento>0);
}
function safeDocumentUrl(value){
 try{
  const u=new URL(String(value||""));
  return u.protocol==="https:"?u:null;
 }catch{return null}
}
Deno.serve(async(req)=>{
 const origin=req.headers.get("origin")||"";
 if(origin&&!ORIGINS.has(origin))return replyJson({ok:false,error:"Origem não autorizada"},403,origin,"no-store");
 if(req.method==="OPTIONS")return new Response(null,{status:204,headers:cors(origin)});
 if(req.method!=="GET")return replyJson({ok:false,error:"Método não permitido"},405,origin,"no-store");
 if(!allowed(req))return replyJson({ok:false,error:"Muitas consultas em pouco tempo"},429,origin,"no-store");

 const url=new URL(req.url),action=url.searchParams.get("action")||"metadata";
 const pncpId=url.searchParams.get("pncp_id")||"",parsed=parsePncpId(pncpId);
 if(!parsed)return replyJson({ok:false,error:"Controle PNCP inválido"},400,origin,"no-store");
 const integrationBase=PNCP_INTEGRATION+"/v1/orgaos/"+parsed.cnpj+"/compras/"+parsed.year+"/"+parsed.sequence;\n const detailBase=PNCP_CONSULTA+"/v1/orgaos/"+parsed.cnpj+"/compras/"+parsed.year+"/"+parsed.sequence;

 try{
  if(action==="metadata"){
   const [detail,docsRaw]=await Promise.all([pncpJson(detailBase),pncpJson(integrationBase+"/arquivos")]);
   return replyJson({ok:true,pncp_id:pncpId,detail,documents:cleanDocs(docsRaw)},200,origin);
  }
  if(action!=="document")return replyJson({ok:false,error:"Ação inválida"},400,origin,"no-store");
  const documentSequence=Number(url.searchParams.get("document_sequence"));
  if(!Number.isSafeInteger(documentSequence)||documentSequence<1)
   return replyJson({ok:false,error:"Documento inválido"},400,origin,"no-store");

  const docs=cleanDocs(await pncpJson(integrationBase+"/arquivos"));
  const selected=docs.find(doc=>doc.sequencialDocumento===documentSequence);
  if(!selected)return replyJson({ok:false,error:"Documento não localizado no PNCP"},404,origin,"no-store");

  // Use PNCP's own documented download endpoint instead of proxying the URL
  // returned in document metadata. This keeps every upstream request pinned to PNCP.
  const documentEndpoint=integrationBase+"/arquivos/"+documentSequence;
  const upstream=await fetchWithTimeout(documentEndpoint,{headers:{"Accept":"application/pdf,application/octet-stream;q=0.9,*/*;q=0.1"}});
  if(!upstream.ok)return replyJson({ok:false,error:"Documento oficial indisponível"},502,origin,"no-store");
  const declared=Number(upstream.headers.get("content-length")||0);
  if(declared>MAX_PDF_BYTES)return replyJson({ok:false,error:"PDF acima do limite desta versão"},413,origin,"no-store");
  const buffer=await upstream.arrayBuffer();
  if(buffer.byteLength>MAX_PDF_BYTES)return replyJson({ok:false,error:"PDF acima do limite desta versão"},413,origin,"no-store");
  const contentType=(upstream.headers.get("content-type")||"").toLowerCase();
  const magic=new TextDecoder("ascii").decode(new Uint8Array(buffer,0,Math.min(5,buffer.byteLength)));
  const looksPdf=magic==="%PDF-"||contentType.includes("pdf");
  if(!looksPdf)return replyJson({ok:false,error:"Este anexo não é um PDF compatível"},415,origin,"no-store");

  const title=selected.titulo.replace(/[\r\n"]/g," ").slice(0,180);
  return new Response(buffer,{
   status:200,
   headers:{
    ...cors(origin),
    "Content-Type":"application/pdf",
    "Content-Length":String(buffer.byteLength),
    "X-Editalume-Document-Title":title,
    "Cache-Control":"public, max-age=3600"
   }
  });
 }catch(error){
  const message=String(error?.message||"");
  const status=message.startsWith("PNCP_404")?404:503;
  return replyJson({ok:false,error:status===404?"Contratação não localizada no PNCP":"PNCP temporariamente indisponível"},status,origin,"no-store");
 }
});