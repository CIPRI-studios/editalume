import assert from "node:assert/strict";
import {PRO_VALUE,PRO_LINK_URL,emailKey,validProSubscription,addCalendarMonth,periodFromVerifiedPayments} from "../supabase/functions/editalume-pro-billing-webhook/core.mjs";
assert.equal(PRO_VALUE,49.90);
assert.equal(PRO_LINK_URL,"https://www.asaas.com/000/c/nruxbdhrq24sn9db");
assert.equal(emailKey(" Cliente@Empresa.Com  "),"cliente@empresa.com");
const sub={id:"sub_abc",paymentLink:"pro_link_123",cycle:"MONTHLY",value:49.90,customer:"cus_abc",deleted:false};
assert(validProSubscription(sub,"pro_link_123"));
for(const patch of [{paymentLink:"wrong"},{cycle:"YEARLY"},{value:59.9},{deleted:true}]){
 assert.equal(validProSubscription({...sub,...patch},"pro_link_123"),false);
}
assert.equal(addCalendarMonth("2026-01-31"),"2026-02-28T00:00:00.000Z");
assert.equal(addCalendarMonth("2026-02-29"),null);
const base={id:"pay_1",subscription:"sub_abc",customer:"cus_abc",value:49.90,status:"RECEIVED",dueDate:"2026-10-02"};
const valid=periodFromVerifiedPayments([base],"sub_abc","cus_abc");
assert.equal(valid.period_until,"2026-11-02T00:00:00.000Z");
assert.equal(periodFromVerifiedPayments([{...base,status:"REFUNDED"}],"sub_abc","cus_abc").active,false);
assert.equal(periodFromVerifiedPayments([{...base,subscription:"sub_other"}],"sub_abc","cus_abc").active,false);
assert.equal(periodFromVerifiedPayments([{...base,customer:"cus_other"}],"sub_abc","cus_abc").active,false);
assert.equal(periodFromVerifiedPayments([{...base,value:19.90}],"sub_abc","cus_abc").active,false);
assert.equal(periodFromVerifiedPayments([base,{...base,id:"pay_2",dueDate:"2026-11-02",status:"CONFIRMED"}],"sub_abc","cus_abc").verified_payment_id,"pay_2");
console.log("PASS Asaas subscription link/amount verification, calendar renewal and refund/wrong-customer checks");
