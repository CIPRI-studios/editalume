/* Offline static regression gate. Live credentials are never generated in CI. */
const fs=require("node:fs"),a=require("node:assert/strict");
const html=fs.readFileSync("site/conta.html","utf8"),js=fs.readFileSync("site/account.js","utf8");
for(const id of ["account-login-form","account-password-login-form","account-password-form","account-password-status","account-new-password","account-confirm-password"]){
 a(html.includes('id="'+id+'"'),"Missing UI element "+id);
}
a(js.includes("client.auth.signInWithOtp"),"Keep passwordless sign-in");
a(js.includes("client.auth.signInWithPassword"),"Add password sign-in");
a(js.includes("client.auth.updateUser({password:first.value})"),"Only Supabase stores passwords");
a(js.includes("if(!state.user)"),"Only authenticated users set password");
a(js.includes("first.value!==confirmation.value"),"Confirm password before saving");
a(html.includes('autocomplete="current-password"'));
a(html.includes('autocomplete="new-password"'));
a(fs.readFileSync("site/sw.js","utf8").includes("account.js?v=2"),"Invalidate PWA cache");
a(fs.readFileSync("site/index.html","utf8").includes("account-bridge.js?v=2"));
console.log("PASS optional password UI, Supabase API wiring, Magic Link retention and cache version");
