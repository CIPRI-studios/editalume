const assert=require("node:assert/strict");
const core=require("../site/company-fit-core.js");

assert.equal(core.validCnpj("19.131.243/0001-97"),true);
assert.equal(core.validCnpj("11.111.111/1111-11"),false);
assert.equal(core.cleanCnpj("19.131.243/0001-97"),"19131243000197");

const words=core.keywordsFromActivities([
 "Comércio atacadista de instrumentos e materiais para uso médico, cirúrgico, hospitalar e de laboratórios"
],"EPI, descartáveis");
assert(words.includes("hospitalar"));
assert(words.includes("medico"));
assert(words.includes("epi"));
assert(words.includes("descartavel"));

const profile={uf:"SP",city:"Campinas",keywords:["hospitalar","medico","equipamento"]};
const fit=core.scoreOpportunity({
 title:"Aquisição de equipamento médico hospitalar",
 agency:"Hospital Municipal",
 municipality:"Campinas",uf:"SP",sector_focus:false
},profile,["hospitalar"]);
assert(fit.score>=80);
assert.equal(core.fitLabel(fit.score),"Alta compatibilidade");

assert.deepEqual(core.buildQueries({uf:"SP",keywords:["hospitalar","medico","equipamento","material"]})[0],{q:"hospitalar",uf:"SP"});
assert.equal(core.officialPncpUrl({pncp_id:"12345678000199-1-25/2026"}),"https://pncp.gov.br/app/editais/12345678000199/2026/25");

console.log("PASS company fit core");