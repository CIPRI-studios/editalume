/** Pure Asaas Pro checks, shared by Deno Edge Functions and Node regression tests. */
export const PRO_VALUE=49.90;
export const PRO_LINK_URL="https://www.asaas.com/000/c/nruxbdhrq24sn9db";
export function emailKey(raw){return typeof raw==="string"?raw.trim().toLowerCase():"";}
export function validProSubscription(sub,expectedId){
 return !!(sub && sub.id && typeof expectedId==="string" && expectedId.length>=4 &&
  sub.paymentLink===expectedId && sub.cycle==="MONTHLY" && Number(sub.value)===PRO_VALUE &&
  sub.customer && !sub.deleted);
}
export function addCalendarMonth(date){
 if(typeof date!=="string"||!/^\d{4}-\d{2}-\d{2}$/.test(date))return null;
 const [year,month,day]=date.split("-").map(Number);
 const base=new Date(Date.UTC(year,month-1,day));
 if(!Number.isFinite(base.getTime())||base.toISOString().slice(0,10)!==date)return null;
 const last=new Date(Date.UTC(year,month+1,0)).getUTCDate();
 return new Date(Date.UTC(year,month,Math.min(day,last))).toISOString();
}
export function periodFromVerifiedPayments(rows,subscriptionId,customerId){
 if(!Array.isArray(rows))throw new Error("payments_not_array");
 let latest=null,latestId=null;
 for(const pay of rows){
  if(!pay||!["CONFIRMED","RECEIVED"].includes(pay.status) ||
    pay.subscription!==subscriptionId||pay.customer!==customerId||
    Number(pay.value)!==PRO_VALUE)continue;
  const until=addCalendarMonth(pay.dueDate);
  if(until&&(!latest||until>latest)){latest=until;latestId=pay.id;}
 }
 return {period_until:latest,verified_payment_id:latestId,active:Boolean(latest&&Date.parse(latest)>Date.now())};
}
