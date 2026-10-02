/** Verified account -> registered intent -> existing Asaas hosted link.
 * Static link alone cannot identify the account to grant. This authenticated step must run first.
 * No monetary API operation is performed by this function.
 */
const ENVIRONMENT="production"; // Sandbox deployment has this one literal replaced.
const DOMAIN="https://cipri-studios.github.io";
const URL_BASE=Deno.env.get("SUPABASE_URL")||"";
const safeJSON=(obj,status=200)=>Response.json(obj,{status,headers:{"Cache-Control":"no-store","Access-Control-Allow-Origin":DOMAIN,"Vary":"Origin"}});
function key(name){return Deno.env.get(name)||"";}
function readKey(value,fallback){
 try{return JSON.parse(value||"{}").default||fallback;}catch{return fallback;}
}
const PUBLISHABLE=readKey(key("SUPABASE_PUBLISHABLE_KEYS"),key("SUPABASE_ANON_KEY"));
const SECRET=readKey(key("SUPABASE_SECRET_KEYS"),key("SUPABASE_SERVICE_ROLE_KEY"));
const userEmail=x=>typeof x==="string"?x.trim().toLowerCase():"";
const expectedLink=ENVIRONMENT==="production"?"https://www.asaas.com/000/c/nruxbdhrq24sn9db":key("ASAAS_SANDBOX_PRO_LINK_URL");
let linkCheckedAt=0,linkHealthy=false;
async function ready(){
 const prefix=ENVIRONMENT==="production"?"ASAAS_LIVE":"ASAAS_SANDBOX";
 const apiKey=key(prefix+"_API_KEY"),linkId=key(prefix+"_PRO_PAYMENT_LINK_ID");
 if(ENVIRONMENT==="production"&&
    (key("ASAAS_LIVE_LAUNCH_ENABLED")!=="true"||key("ASAAS_LIVE_QA_APPROVED")!=="true"))
  return false;
 if(apiKey.length<16||key(prefix+"_WEBHOOK_TOKEN").length<32||linkId.length<4||
    !/^https:\/\//.test(expectedLink)||!URL_BASE||!SECRET||!PUBLISHABLE)return false;
 if(Date.now()-linkCheckedAt<60000)return linkHealthy;
 linkHealthy=false;
 try{
  const api=ENVIRONMENT==="production"?"https://api.asaas.com/v3":"https://api-sandbox.asaas.com/v3";
  const response=await fetch(api+"/paymentLinks/"+encodeURIComponent(linkId),{
   headers:{"access_token":apiKey,"accept":"application/json","User-Agent":"Editalume-CIPRI/1.0"}
  });
  if(!response.ok)return false;
  const link=await response.json();
  linkHealthy=Boolean(link.id===linkId&&Number(link.value)===49.90&&link.chargeType==="RECURRENT"&&
    link.subscriptionCycle==="MONTHLY"&&link.active!==false&&typeof link.url==="string"&&
    new URL(link.url).pathname===new URL(expectedLink).pathname);
  linkCheckedAt=Date.now();
  return linkHealthy;
 }catch{return false;}
}
async function db(path,init={}){
 const h={"apikey":SECRET,"Content-Type":"application/json",...(init.headers||{})};
 if(SECRET.startsWith("eyJ"))h.Authorization="Bearer "+SECRET;
 return fetch(URL_BASE+"/rest/v1/"+path,{...init,headers:h});
}
async function authenticated(req){
 const h=req.headers.get("authorization")||"";
 if(!/^Bearer [\w.-]+$/.test(h))return null;
 const r=await fetch(URL_BASE+"/auth/v1/user",{headers:{"apikey":PUBLISHABLE,"authorization":h}});
 if(!r.ok)return null;
 const user=await r.json();
 if(!user.id||!user.email_confirmed_at||!userEmail(user.email))return null;
 return user;
}
Deno.serve(async req=>{
 const origin=req.headers.get("origin");
 if(origin&&origin!==DOMAIN)return safeJSON({error:"origin_not_allowed"},403);
 if(req.method==="OPTIONS")return new Response(null,{status:204,headers:{"Access-Control-Allow-Origin":DOMAIN,"Access-Control-Allow-Methods":"GET,POST,OPTIONS","Access-Control-Allow-Headers":"Authorization,apikey,Content-Type","Access-Control-Max-Age":"600"}});
 if(!["GET","POST"].includes(req.method))return safeJSON({error:"method_not_allowed"},405);
 try{
  if(!URL_BASE||!PUBLISHABLE||!SECRET)return safeJSON({error:"backend_not_configured"},503);
  const user=await authenticated(req);
  if(!user)return safeJSON({error:"verify_email_and_sign_in_first"},401);
  const route="/rest/v1/editalume_billing_intents";
  if(req.method==="GET"){
   const response=await db("editalume_billing_intents?environment=eq."+ENVIRONMENT+"&user_id=eq."+encodeURIComponent(user.id)+"&select=created_at&limit=1");
   if(!response.ok)return safeJSON({error:"billing_status_unavailable"},503);
   const registrations=await response.json();
   return safeJSON({ready:await ready(),registered:registrations.length>0,environment:ENVIRONMENT});
  }
  if(!await ready())return safeJSON({error:"payment_integration_not_enabled"},503);
  if(Number(req.headers.get("content-length")||0)>1024)return safeJSON({error:"body_too_large"},413);
  const existing=await db("editalume_billing_intents?environment=eq."+ENVIRONMENT+"&user_id=eq."+encodeURIComponent(user.id)+"&select=verified_email&limit=1");
  if(!existing.ok)return safeJSON({error:"lookup_failed"},503);
  const rows=await existing.json();
  const email=userEmail(user.email);
  if(rows.length&&rows[0].verified_email!==email)return safeJSON({error:"email_changed_contact_support"},409);
  if(!rows.length){
   const saved=await db("editalume_billing_intents?on_conflict=environment,user_id",{
    method:"POST",headers:{"Prefer":"resolution=ignore-duplicates,return=minimal"},
    body:JSON.stringify({environment:ENVIRONMENT,user_id:user.id,verified_email:email})
   });
   if(!saved.ok)return safeJSON({error:"intent_registration_failed"},503);
  }
  return safeJSON({ready:true,environment:ENVIRONMENT,checkoutUrl:expectedLink,notice:"Subscription status is granted only after verified Asaas payment."});
 }catch(_){return safeJSON({error:"billing_unavailable"},503);}
});
