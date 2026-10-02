/* Regression: market only features that exist, disclose features not launched. */
"use strict";
const fs=require("node:fs"),assert=require("node:assert/strict");
const home=fs.readFileSync("site/index.html","utf8");
const account=fs.readFileSync("site/conta.html","utf8");
const privacy=fs.readFileSync("site/privacidade.html","utf8");
const asaas=fs.readFileSync("docs/ASAAS_LINKS_OPERACAO.md","utf8");
for(const phrase of ["Prévia de cinco resultados","CSV de até 200 resultados","Painel estratégico com cinco indicadores","Até três pesquisas personalizadas salvas","em desenvolvimento"]){
 assert(home.includes(phrase),"Missing Free/Pro disclosure: "+phrase);
}
assert(home.includes("R$ 49,90"),"Planned price should remain clear");
assert(home.includes("O link de assinatura mensal do Pro já foi criado no Asaas"),"Pro checkout created but not active");
assert(home.includes("ainda não está conectado à ativação da conta"),"Cannot collect before account fulfillment");
assert(!home.includes('id="sob-medida-mensal"'),"No invented monthly manual product");
assert(home.includes('id="sob-medida"'),"Keep single manual report");
assert(home.includes('id="oneoff-checkout"'),"Individual product must have a direct checkout CTA");
assert(home.includes('href="https://www.asaas.com/000/c/7ea8eja903t5z4wr"'),"Direct CTA targets exact verified one-off Asaas checkout");
assert(home.includes('id="oneoff-briefing"'),"Manual fulfillment needs a customer briefing step");
assert(!home.includes('href="https://www.asaas.com/000/c/nruxbdhrq24sn9db"'),"Do not expose monthly Pro checkout until entitlement automation is verified");
assert(privacy.includes("pago diretamente em link externo do Asaas"),"Privacy/fulfillment copy matches one-off checkout");
assert(asaas.includes("nruxbdhrq24sn9db")&&asaas.includes("7ea8eja903t5z4wr"),"Both Asaas links documented");
assert(asaas.includes("problemas de formatação"),"Track remaining Asaas checkout formatting issue");

assert(home.includes("pncp.gov.br/app/editais"),"Public official PNCP source always linked");
assert(account.includes("CSV de até 200 resultados"),"Pro account teaser is not obsolete");
assert(account.includes("Alertas automáticos e contratação comercial ainda não estão disponíveis"),"Do not market inactive delivery");
assert(privacy.includes("Se você salvar editais ou pesquisas estratégicas na conta"),"Private saved-search handling disclosed");
assert(privacy.includes("A contratação comercial do Pro e os alertas automáticos ainda não estão disponíveis"),"Privacy copy matches actual service");
console.log("PASS: Free/Pro commercial copy, pilot status, privacy and unlaunched alert/billing disclaimers");
