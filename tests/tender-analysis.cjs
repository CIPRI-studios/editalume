const assert=require("node:assert/strict");
const core=require("../site/tender-analysis-core.js");

assert.deepEqual(core.parsePncpId("88861448000140-1-000529/2026"),{
 cnpj:"88861448000140",sequence:529,year:2026,pncpId:"88861448000140-1-000529/2026"
});
assert.equal(core.parsePncpId("invalido"),null);
assert.equal(core.officialNoticeUrl("88861448000140-1-000529/2026"),"https://pncp.gov.br/app/editais/88861448000140/2026/529");

const detail=core.normalizeDetail({
 numeroControlePNCP:"88861448000140-1-000529/2026",
 objetoCompra:"Aquisição de materiais",
 orgaoEntidade:{razaoSocial:"Município Exemplo"},
 modalidadeNome:"Pregão eletrônico",
 dataEncerramentoProposta:"2026-10-22T10:00:00-03:00",
 valorTotalEstimado:215691
},{});
assert.equal(detail.object,"Aquisição de materiais");
assert.equal(detail.agency,"Município Exemplo");
assert.equal(detail.estimatedValue,215691);

const docs=core.rankDocuments(core.normalizeDocuments([
 {sequencialDocumento:2,titulo:"Anexo I",tipoDocumentoNome:"Anexo",url:"https://pncp.gov.br/a.pdf"},
 {sequencialDocumento:1,titulo:"Edital 79/2026",tipoDocumentoNome:"Edital",url:"https://pncp.gov.br/e.pdf"}
]));
assert.equal(docs[0].sequence,1);

const evidence=core.extractEvidence([
 {page:3,text:"Para fins de habilitação jurídica deverão ser apresentados os documentos previstos neste edital."},
 {page:12,text:"A contratada deverá realizar visita técnica ao local antes da apresentação da proposta."},
 {page:18,text:"O pagamento será efetuado em até 30 dias após o aceite definitivo."}
],docs[0]);
assert(evidence.some(x=>x.category==="habilitacao"&&x.page===3));
assert(evidence.some(x=>x.category==="visita"&&x.page===12));
assert(evidence.some(x=>x.category==="pagamento"&&x.page===18));
assert(evidence.every(x=>x.source==="Edital 79/2026"));
console.log("PASS tender analysis core");