/* Regression: market only features that exist, disclose features not launched. */
"use strict";
const fs=require("node:fs"),assert=require("node:assert/strict");
const home=fs.readFileSync("site/index.html","utf8");
const account=fs.readFileSync("site/conta.html","utf8");
const privacy=fs.readFileSync("site/privacidade.html","utf8");
for(const phrase of ["Prévia de cinco resultados","CSV de até 200 resultados","Painel estratégico com cinco indicadores","Até três pesquisas personalizadas salvas","em desenvolvimento"]){
 assert(home.includes(phrase),"Missing Free/Pro disclosure: "+phrase);
}
assert(home.includes("R$ 49,90"),"Planned price should remain clear");
assert(home.includes("cobrança recorrente continuam em desenvolvimento"),"No false live billing claim");
assert(home.includes('id="sob-medida-mensal"'),"Monthly manual Sob Medida is a separate offer");
assert(home.includes("R$ 49,90 <small>/ mês · assinatura recorrente"),"Monthly manual pricing is explicit");
assert(home.includes("id=\"sob-medida\""),"Individual Sob Medida remains available");
assert(home.includes("link individual do Asaas"),"One-off checkout is sent after feasibility confirmation");
assert(!home.includes("https://www.asaas.com/000/c/"),"No unattended payment before merchant identity and scope are checked");
assert(home.includes("não libera o Pro"),"Manual monthly checkout must not be marketed as Pro");

assert(home.includes("pncp.gov.br/app/editais"),"Public official PNCP source always linked");
assert(account.includes("CSV de até 200 resultados"),"Pro account teaser is not obsolete");
assert(account.includes("Alertas automáticos e contratação comercial ainda não estão disponíveis"),"Do not market inactive delivery");
assert(privacy.includes("Se você salvar editais ou pesquisas estratégicas na conta"),"Private saved-search handling disclosed");
assert(privacy.includes("As assinaturas e envios automáticos do Editalume Pro ainda não estão disponíveis"),"Privacy copy matches actual service");
console.log("PASS: Free/Pro commercial copy, pilot status, privacy and unlaunched alert/billing disclaimers");
