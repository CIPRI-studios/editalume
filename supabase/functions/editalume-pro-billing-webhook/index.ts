/** Asaas recurring Pro reconciliation: no email from the webhook can grant access.
 * Every event is authenticated and rechecked against the Asaas API, exact
 * payment link, subscription, monthly price and verified Supabase account.
 * SANDBOX NEVER CHANGES public.editalume_entitlements.
 */
import {emailKey,validProSubscription,periodFromVerifiedPayments,hasOriginalLinkPayment,PRO_VALUE} from "./core.mjs";
const ENVIRONMENT="production"; // Substitute only for sandbox deployment.
const S=Deno.env.get.bind(Deno.env);
const prefix=ENVIRONMENT==="production"?"ASAAS_LIVE":"ASAAS_SANDBOX";
const API=ENVIRONMENT==="production"?"https://api.asaas.com/v3":"https://api-sandbox.asaas.com/v3";
const URL_BASE=S("SUPABASE_URL")||"";
const token=S(prefix+"_WEBHOOK_TOKEN")||"";
const key=S(prefix+"_API_KEY")||"";
const linkId=S(prefix+"_PRO_PAYMENT_LINK_ID")||"";
const linkUrl=ENVIRONMENT==="production"?"https://www.asaas.com/000/c/nruxbdhrq24sn9db":S("ASAAS_SANDBOX_PRO_LINK_URL")||"";
function secretKey(){try{return JSON.parse(S("SUPABASE_SECRET_KEYS")||"{}").default||S("SUPABASE_SERVICE_ROLE_KEY")||""}catch{return S("SUPABASE_SERVICE_ROLE_KEY")||""}}
const secret=secretKey();
const json=(payload,status=200)=>Response.json(payload,{status,headers:{"Cache-Control":"no-store"}});
const enc=new TextEncoder();
async function sameSecret(a,b){
 if(typeof a!=="string"||typeof b!=="string"||a.length<32||b.length<32||a.length>255||b.length>255)return false;
 const [x,y]=await Promise.all([crypto.subtle.digest("SHA-256",enc.encode(a)),crypto.subtle.digest("SHA-256",enc.encode(b))]);
 const u=new Uint8Array(x),v=new Uint8Array(y);let diff=0;
 for(let i=0;i<u.length;i++)diff|=u[i]^v[i];
 return diff===0;
}
async function db(path,init={}){
 const headers={"apikey":secret,"Content-Type":"application/json",...(init.headers||{})};
 if(secret.startsWith("eyJ"))headers.Authorization="Bearer "+secret;
 return fetch(URL_BASE+"/rest/v1/"+path,{...init,headers});
}
async function dbJson(path){
 const res=await db(path);if(!res.ok)throw Error("database_read_failed");
 return await res.json();
}
async function dbWrite(table,row,conflict){
 const response=await db(table+"?on_conflict="+encodeURIComponent(conflict),{
  method:"POST",headers:{"Prefer":"resolution=merge-duplicates,return=minimal"},body:JSON.stringify(row)
 });
 if(!response.ok)throw Error("database_write_failed");
}
async function asaas(path){
 const res=await fetch(API+path,{headers:{"access_token":key,"accept":"application/json","User-Agent":"Editalume-CIPRI/1.0"}});
 if(!res.ok)throw Error("asaas_api_unavailable_"+res.status);
 return await res.json();
}
async function auditLink(){
 const raw=await asaas("/paymentLinks/"+encodeURIComponent(linkId));
 if(raw.id!==linkId||Number(raw.value)!==PRO_VALUE||raw.chargeType!=="RECURRENT"||
    raw.subscriptionCycle!=="MONTHLY"||raw.active===false||
    typeof raw.url!=="string"||new URL(raw.url).pathname!==new URL(linkUrl).pathname)
    throw Error("asaas_pro_link_mismatch");
}
async function readPayments(subId){
 const rows=[];
 for(let offset=0;offset<500;offset+=100){
  const response=await asaas("/subscriptions/"+encodeURIComponent(subId)+"/payments?offset="+offset+"&limit=100");
  if(!Array.isArray(response.data))throw Error("bad_payment_list");
  rows.push(...response.data);
  if(!response.hasMore)return rows;
 }
 throw Error("too_many_payments_manual_review_required");
}
function isoDate(x){return typeof x==="string"&&/^\\d{4}-\\d{2}-\\d{2}/.test(x)?x:null}
async function recomputeEntitlement(userId){
 if(ENVIRONMENT!=="production")return;
 const subs=await dbJson("editalume_asaas_subscriptions?environment=eq.production&user_id=eq."+encodeURIComponent(userId)+"&select=period_until,billing_status");
 let until=null;
 for(const s of subs){
  if(!s||!s.period_until)continue;
  if(!until||Date.parse(s.period_until)>Date.parse(until))until=s.period_until;
 }
 const existing=await dbJson("editalume_entitlements?user_id=eq."+encodeURIComponent(userId)+"&select=plan,active_until,billing_source&limit=1");
 const old=existing[0];
 // Do not accidentally revoke/replace a separately granted manual Pro trial.
 if(old?.plan==="premium"&&!old.billing_source&&old.active_until&&Date.parse(old.active_until)>Date.now())return;
 if(old?.billing_source&&old.billing_source!=="asaas_pro")return;
 const active=Boolean(until&&Date.parse(until)>Date.now());
 await dbWrite("editalume_entitlements",{
  user_id:userId,plan:active?"premium":"free",active_until:active?until:null,
  last_verified_at:active?new Date().toISOString():null,billing_source:"asaas_pro",
  updated_at:new Date().toISOString()
 },"user_id");
}
async function markEvent(raw,code){
 const sub=typeof raw?.subscription?.id==="string"?raw.subscription.id:typeof raw?.payment?.subscription==="string"?raw.payment.subscription:null;
 const obj={environment:ENVIRONMENT,event_id:raw.id,event_type:raw.event,
   payment_id:typeof raw?.payment?.id==="string"?raw.payment.id:null,subscription_id:sub,
   external_reference:null,payment_status:typeof raw?.payment?.status==="string"?raw.payment.status:null,
   source_verified:true,processing_state:code,
   processed_at:code==="processed"||code==="ignored"||code==="unmatched"?new Date().toISOString():null};
 await dbWrite("editalume_asaas_events",obj,"environment,event_id");
}
Deno.serve(async req=>{
 if(req.method!=="POST")return json({ok:false,error:"method_not_allowed"},405);
 if(!URL_BASE||!secret||!token||!key||!linkId||!linkUrl||
    (ENVIRONMENT==="production"&&(S("ASAAS_LIVE_LAUNCH_ENABLED")!=="true"||S("ASAAS_LIVE_QA_APPROVED")!=="true")))
    return json({ok:false,error:"billing_not_configured"},503);
 if(!await sameSecret(req.headers.get("asaas-access-token"),token))
    return json({ok:false,error:"unauthorized"},401);
 try{
  const length=Number(req.headers.get("content-length")||"0");
  if(length>16384)return json({ok:false,error:"payload_too_large"},413);
  const body=await req.text();
  if(enc.encode(body).length>16384)return json({ok:false,error:"payload_too_large"},413);
  const ev=JSON.parse(body);
  if(!ev||typeof ev!=="object"||!/^[-_&.a-zA-Z0-9]{5,150}$/.test(ev.id||"")||
     !/^(PAYMENT_|SUBSCRIPTION_)[A-Z_]{3,75}$/.test(ev.event||""))
    return json({ok:false,error:"bad_event"},400);
  const supported=new Set(["PAYMENT_CREATED","PAYMENT_UPDATED","PAYMENT_CONFIRMED","PAYMENT_RECEIVED",
    "PAYMENT_OVERDUE","PAYMENT_REFUNDED","PAYMENT_DELETED","SUBSCRIPTION_CREATED",
    "SUBSCRIPTION_UPDATED","SUBSCRIPTION_INACTIVATED","SUBSCRIPTION_DELETED"]);
  if(!supported.has(ev.event))return json({ok:true,ignored:true});
  await markEvent(ev,"pending");
  const subId=typeof ev?.payment?.subscription==="string"?ev.payment.subscription:
    typeof ev?.subscription?.id==="string"?ev.subscription.id:null;
  if(!subId){await markEvent(ev,"ignored");return json({ok:true,ignored:true});}
  // All private Asaas objects are freshly fetched. Notification payload is not a receipt.
  await auditLink();
  let subscription;
  try{subscription=await asaas("/subscriptions/"+encodeURIComponent(subId));}
  catch(err){
   if(ev.event==="SUBSCRIPTION_DELETED"){
    const mapped=await dbJson("editalume_asaas_subscriptions?environment=eq."+ENVIRONMENT+
      "&subscription_id=eq."+encodeURIComponent(subId)+"&select=user_id&limit=1");
    if(mapped.length){
     const updated=await db("editalume_asaas_subscriptions?environment=eq."+ENVIRONMENT+
      "&subscription_id=eq."+encodeURIComponent(subId),{method:"PATCH",body:JSON.stringify({billing_status:"deleted"})});
     if(!updated.ok)throw Error("deleted_subscription_update_failed");
     await recomputeEntitlement(mapped[0].user_id);
    }
    await markEvent(ev,"processed");return json({ok:true});
   }
   throw err;
  }
  if(!validProSubscription(subscription,linkId)){
   await markEvent(ev,"ignored");
   return json({ok:true,ignored:true});
  }
  const customer=await asaas("/customers/"+encodeURIComponent(subscription.customer));
  const email=emailKey(customer.email);
  if(!email){await markEvent(ev,"unmatched");return json({ok:true,unmatched:true});}
  const users=await dbJson("editalume_billing_intents?environment=eq."+ENVIRONMENT+
   "&verified_email=eq."+encodeURIComponent(email)+"&select=user_id&limit=2");
  if(users.length!==1){await markEvent(ev,"unmatched");return json({ok:true,unmatched:true});}
  const userId=users[0].user_id;
  const current=await dbJson("editalume_asaas_subscriptions?environment=eq."+ENVIRONMENT+
   "&subscription_id=eq."+encodeURIComponent(subId)+"&select=user_id,customer_id&limit=1");
  if(current.length&&(current[0].user_id!==userId||current[0].customer_id!==subscription.customer))
   throw Error("existing_subscription_account_conflict");
  const payments=await readPayments(subId);
  // Asaas guarantees paymentLink on a payment generated by the hosted link;
  // GET subscription may omit paymentLink. Either trusted API origin suffices.
  if(subscription.paymentLink!==linkId&&!hasOriginalLinkPayment(payments,linkId,subId,subscription.customer)){
   await markEvent(ev,"unmatched");
   return json({ok:true,unmatched:true});
  }
  // Verify paid invoices directly. Stale/out-of-order events all recompute the full payment list.
  const period=periodFromVerifiedPayments(payments,subId,subscription.customer);
  await dbWrite("editalume_asaas_subscriptions",{
   environment:ENVIRONMENT,subscription_id:subId,user_id:userId,
   customer_id:subscription.customer,payment_link_id:linkId,
   billing_status:subscription.status||"UNKNOWN",verified_payment_id:period.verified_payment_id,
   period_until:period.period_until,verified_at:new Date().toISOString()
  },"environment,subscription_id");
  await recomputeEntitlement(userId);
  await markEvent(ev,"processed");
  return json({ok:true});
 }catch(err){
  // Non-2xx enables Asaas retries. No private token or payer detail is returned.
  return json({ok:false,error:"reconciliation_failed"},503);
 }
});
