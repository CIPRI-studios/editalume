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
 {sequencialDocumento:1,titulo:"Edital 79/2026",tipoDocumentoNome:"Edital",url:"https://pncp.gov.br/documento/123"},
 {sequencialDocumento:3,titulo:"Arquivos auxiliares",tipoDocumentoNome:"ZIP",url:"https://pncp.gov.br/a.zip"}
]));
assert.equal(docs[0].sequence,1);
assert.equal(docs[0].isPdf,true);
assert.equal(docs.find(x=>x.sequence===3).isPdf,false);

const evidence=core.extractEvidence([
 {page:3,text:"Para fins de habilitação jurídica deverão ser apresentados os documentos previstos neste edital."},
 {page:12,text:"A contratada deverá realizar visita técnica ao local antes da apresentação da proposta."},
 {page:18,text:"O pagamento será efetuado em até 30 dias após o aceite definitivo."}
],docs[0]);
assert(evidence.some(x=>x.category==="habilitacao"&&x.page===3));
assert(evidence.some(x=>x.category==="visita"&&x.page===12));
assert(evidence.some(x=>x.category==="pagamento"&&x.page===18));
assert(evidence.every(x=>x.source==="Edital 79/2026"));
const profile={name:"Fornecedor Saúde",uf:"TO",city:"Palmas",keywords:["equipamento","hospitalar","mobiliario"]};
const opportunity={
 object:"Aquisição de equipamentos médico-hospitalares e mobiliário assistencial",
 uf:"TO",municipality:"Palmas",endAt:"2026-10-20T12:00:00-03:00"
};
const preliminary=core.participationDecision(opportunity,{},profile,[],{nowMs:Date.parse("2026-10-05T12:00:00-03:00"),evidenceReviewed:false});
assert.equal(preliminary.available,true);
assert(preliminary.score>=80);
assert.equal(preliminary.label,"Boa candidata para avançar");
assert.equal(preliminary.stage,"preliminar");
assert(preliminary.positives.some(x=>x.includes("mesmo município")));

const riskEvidence=[
 {category:"visita",page:8,source:"Edital.pdf",term:"visita tecnica",snippet:"Será obrigatória visita técnica ao local."},
 {category:"habilitacao",page:14,source:"Edital.pdf",term:"atestado de capacidade",snippet:"Apresentar atestado de capacidade técnica compatível."}
];
const refined=core.participationDecision(opportunity,{},profile,riskEvidence,{nowMs:Date.parse("2026-10-05T12:00:00-03:00"),evidenceReviewed:true});
assert(refined.score<preliminary.score);
assert.equal(refined.stage,"documental");
assert(refined.cautions.some(x=>x.evidence?.page===8));
assert(refined.cautions.some(x=>x.evidence?.page===14));

const missing=core.participationDecision(opportunity,{},null,[],{nowMs:Date.parse("2026-10-05T12:00:00-03:00")});
assert.equal(missing.available,false);
assert.equal(missing.score,null);

const ended=core.participationDecision({...opportunity,endAt:"2026-10-01T12:00:00-03:00"},{},profile,[],{nowMs:Date.parse("2026-10-05T12:00:00-03:00")});
assert.equal(ended.score,0);
assert.equal(ended.label,"Prazo encerrado");

console.log("PASS tender analysis core");