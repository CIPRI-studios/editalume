/* Editalume account — Magic Link + owner-scoped cloud favorites.
   Public publishable key only. Subscription entitlements are NEVER changed here. */
(async () => {
 "use strict";
 const $ = id => document.getElementById(id);
 const status = $("account-status");
 const announce = (message,error=false) => {
   if(!status)return;
   status.textContent=message; status.classList.toggle("error",error);
 };
 let sdk;
 try {
   sdk = await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.117.2/+esm");
 } catch (_error) {
   announce("Não foi possível carregar o login. Verifique a conexão e tente novamente.",true);
   return;
 }
 const client=sdk.createClient(
   "https://jhxhbgprjqppzfrjdfvj.supabase.co",
   "sb_publishable_O85v7HRJg7br9kxUbvticw_NNO8jp4w",
   {auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,flowType:"implicit"}}
 );
 const state={user:null,favorites:[],savedSearches:[],pro:false,error:null};
 const emit=()=>window.dispatchEvent(new CustomEvent("editalume-account-changed"));
 const official=id=>{
   const match=/^(\d{14})-\d+-(\d+)\/(\d{4})$/.exec(id||"");
   return match&&Number(match[2])>0
     ?"https://pncp.gov.br/app/editais/"+match[1]+"/"+match[3]+"/"+Number(match[2]):null;
 };
 async function loadFavorites(){
   const {data,error}=await client.from("editalume_favorites")
     .select("pncp_id,title,uf,closing_at,created_at")
     .eq("user_id",state.user.id).order("created_at",{ascending:false}).limit(200);
   if(error)throw new Error("Não foi possível consultar os favoritos da conta.");
   state.favorites=data||[];
 }
 async function loadSavedSearches(){
   if(!state.pro){state.savedSearches=[];return;}
   const {data,error}=await client.from("editalume_saved_searches")
     .select("id,name,search_text,uf,city,sector_focus,min_value,deadline_days,created_at")
     .eq("user_id",state.user.id).order("created_at",{ascending:false}).limit(3);
   if(error)throw new Error("Não foi possível consultar suas pesquisas Pro.");
   state.savedSearches=data||[];
 }
 async function createSavedSearch(raw){
   if(!state.user||!state.pro)throw new Error("Apenas contas Pro verificadas podem salvar pesquisas.");
   if(state.savedSearches.length>=3)throw new Error("Você já possui três pesquisas Pro. Remova uma antes de salvar outra.");
   const name=String(raw?.name||"").trim();
   if(name.length<2||name.length>60)throw new Error("Informe um nome entre 2 e 60 caracteres.");
   const uf=typeof raw?.uf==="string"&&/^[A-Z]{2}$/.test(raw.uf)?raw.uf:null;
   const days=raw?.deadline_days==null?null:Number(raw.deadline_days);
   const payload={
     user_id:state.user.id,name,
     search_text:String(raw?.search_text||"").trim().slice(0,120)||null,
     uf,city:String(raw?.city||"").trim().slice(0,90)||null,
     sector_focus:typeof raw?.sector_focus==="boolean"?raw.sector_focus:null,
     min_value:Number.isFinite(Number(raw?.min_value))&&raw?.min_value!=null?Math.max(0,Number(raw.min_value)):null,
     deadline_days:Number.isInteger(days)&&days>=1&&days<=90?days:null,
     alerts_enabled:false
   };
   const {error}=await client.from("editalume_saved_searches").insert(payload);
   if(error)throw new Error(/three|maximum|limite/i.test(error.message)
     ?"Limite de três pesquisas atingido.": "Não foi possível salvar. Confirme se sua assinatura Pro está ativa.");
   await loadSavedSearches();render();emit();
   return true;
 }
 async function deleteSavedSearch(id){
   if(!state.user||!state.pro||!state.savedSearches.some(x=>x.id===id))
     throw new Error("Esta pesquisa não está disponível na sua conta Pro.");
   const {error}=await client.from("editalume_saved_searches").delete()
     .eq("user_id",state.user.id).eq("id",id);
   if(error)throw new Error("Não foi possível excluir esta pesquisa.");
   await loadSavedSearches();render();emit();
   return true;
 }
 async function reload(){
   try{
     const {data:{session},error:sessionError}=await client.auth.getSession();
     if(sessionError)throw sessionError;
     if(!session){
       state.user=null;state.favorites=[];state.savedSearches=[];state.pro=false;state.error=null;
       render();emit();return;
     }
     const {data:{user},error:userError}=await client.auth.getUser();
     if(userError||!user)throw userError||new Error("Sessão inválida");
     state.user=user;
     const {data:ent,error:entError}=await client.from("editalume_entitlements")
       .select("plan,active_until,last_verified_at").eq("user_id",user.id).maybeSingle();
     if(entError)throw entError;
     state.pro=!!(ent?.plan==="premium"&&ent?.last_verified_at&&
       ent?.active_until&&Date.parse(ent.active_until)>Date.now());
     await loadFavorites();await loadSavedSearches();
     state.error=null;render();emit();
   }catch(_err){
     state.pro=false;state.savedSearches=[];
     state.error="Não foi possível validar a conta neste momento. Recursos Pro temporariamente bloqueados.";
     render();announce(state.error,true);emit();
   }
 }
 function guestFavorites(){
   try{
     const rows=JSON.parse(localStorage.getItem("editalume_saved_pncp_v1")||"[]");
     return Array.isArray(rows)?rows.filter(x=>x&&official(x.pncp_id)&&typeof x.title==="string"
       &&/^[A-Z]{2}$/.test(x.uf)&&Number.isFinite(Date.parse(x.closing_at))).slice(0,30):[];
   }catch{return []}
 }
 async function toggleFavorite(raw){
   if(!state.user)throw new Error("Entre na conta antes de sincronizar os favoritos.");
   const row={pncp_id:String(raw?.pncp_id||""),title:String(raw?.title||"").slice(0,300),
     uf:String(raw?.uf||""),closing_at:raw?.closing_at};
   if(!official(row.pncp_id))throw new Error("O identificador deste edital é inválido.");
   const exists=state.favorites.some(x=>x.pncp_id===row.pncp_id);
   const q=exists
     ? client.from("editalume_favorites").delete().eq("user_id",state.user.id).eq("pncp_id",row.pncp_id)
     : client.from("editalume_favorites").insert({user_id:state.user.id,...row});
   const {error}=await q;
   if(error){
     if(/limit|quota|quota|atingido|reached/i.test(error.message))
       throw new Error("Você atingiu o limite de favoritos do seu plano. Remova um edital ou conheça o Pro.");
     throw new Error("Não foi possível salvar. Confirme se o edital ainda consta na nossa base e tente novamente.");
   }
   await loadFavorites();
   render();emit();
   return !exists;
 }
 async function getAccessToken(){
   if(!state.user||!state.pro)return null;
   const {data:{session},error}=await client.auth.getSession();
   if(error)throw error;
   return session?.user?.id===state.user.id?session.access_token:null;
 }
 const api={get user(){return state.user},get favorites(){return state.favorites},
   get savedSearches(){return state.savedSearches},get isPro(){return state.pro},
   toggleFavorite,createSavedSearch,deleteSavedSearch,getAccessToken,refresh:reload};
 window.EditalumeAccount=Object.freeze(api);
 function renderFavorites(){
   const root=$("account-favorites");if(!root)return;
   root.replaceChildren();
   const count=$("account-favorites-count");
   if(count)count.textContent=state.favorites.length+" / "+(state.pro?"200":"5")+" favoritos na nuvem";
   if(!state.favorites.length){const p=document.createElement("p");p.textContent="Ainda não há favoritos. Volte à busca nacional e salve uma oportunidade.";root.append(p);return}
   for(const item of state.favorites){
     const card=document.createElement("article");card.className="account-favorite";
     const title=document.createElement("strong");title.textContent=item.title;
     const detail=document.createElement("small");
     detail.textContent=item.uf+" · Prazo registrado: "+new Date(item.closing_at).toLocaleDateString("pt-BR",{timeZone:"America/Sao_Paulo"})+" · Verifique sempre no PNCP";
     const actions=document.createElement("div");actions.className="account-favorite-actions";
     const link=document.createElement("a");link.textContent="Ver edital oficial ↗";link.rel="noopener noreferrer";link.target="_blank";link.href=official(item.pncp_id);
     const remove=document.createElement("button");remove.type="button";remove.textContent="Remover";
     remove.addEventListener("click",async()=>{
       remove.disabled=true;try{await toggleFavorite(item);announce("Favorito removido.");}
       catch(error){announce(error.message,true);remove.disabled=false;}
     });
     actions.append(link,remove);card.append(title,detail,actions);root.append(card);
   }
 }

 function renderSavedSearches(){
   const panel=$("account-pro-searches"),root=$("account-pro-searches-list");
   if(!panel||!root)return;
   panel.hidden=!state.pro;
   if(!state.pro)return;
   root.replaceChildren();
   const count=$("account-pro-searches-count");
   if(count)count.textContent=state.savedSearches.length+" / 3 pesquisas";
   if(!state.savedSearches.length){
     const p=document.createElement("p");
     p.textContent="Nenhuma pesquisa salva. Crie sua primeira pesquisa estratégica no radar nacional.";
     root.append(p);return;
   }
   for(const item of state.savedSearches){
     const card=document.createElement("article");card.className="pro-search";
     const main=document.createElement("div");main.className="pro-search-main";
     const title=document.createElement("strong");title.textContent=item.name;
     const detail=document.createElement("small");
     detail.textContent=[item.uf||"Brasil",item.city||"",item.search_text||""].filter(Boolean).join(" · ");
     main.append(title,detail);
     const actions=document.createElement("div");actions.className="pro-search-actions";
     const link=document.createElement("a");link.textContent="Abrir busca ↗";
     const url=new URL("./",window.location.href);
     url.hash="brasil";
     const pairs=[["q",item.search_text],["uf",item.uf],["city",item.city],
      ["focus",typeof item.sector_focus==="boolean"?String(item.sector_focus):""],
      ["days",item.deadline_days],["min",item.min_value]];
     for(const [key,value] of pairs)if(value!==null&&value!==undefined&&value!=="")
       url.searchParams.set(key,String(value));
     link.href=url.href;
     const remove=document.createElement("button");remove.type="button";remove.textContent="Excluir";
     remove.setAttribute("aria-label","Excluir pesquisa: "+item.name);
     remove.addEventListener("click",async()=>{
       if(!window.confirm("Excluir a pesquisa "+item.name+"?"))return;
       remove.disabled=true;
       try{await deleteSavedSearch(item.id);announce("Pesquisa excluída.");}
       catch(error){announce(error.message,true);remove.disabled=false;}
     });
     actions.append(link,remove);card.append(main,actions);root.append(card);
   }
 }
 function render(){
   const logged=!!state.user,login=$("account-login"),panel=$("account-panel");
   if(login)login.hidden=logged;if(panel)panel.hidden=!logged;
   if(logged&&panel){
     $("account-email").textContent=state.user.email||"Conta Editalume";
     $("account-plan").textContent=state.pro?"Editalume Pro ativo":"Explorar · Grátis";
     $("account-plan-note").textContent=state.pro
       ?"Acesso Pro verificado. Alertas por e-mail serão liberados somente quando o serviço estiver operacional."
       :"Sua conta gratuita permite até cinco favoritos sincronizados. A assinatura Pro está em preparação.";
     renderFavorites();renderSavedSearches();
     const importButton=$("account-import");
     if(importButton){
       const pending=guestFavorites().filter(x=>!state.favorites.some(f=>f.pncp_id===x.pncp_id));
       importButton.hidden=!pending.length;
       importButton.textContent="Importar favoritos deste dispositivo ("+pending.length+")";
     }
   }
   if(!state.error)announce(logged?"Sua conta está conectada.":"Entre com um link enviado para seu e-mail.");
 }
 if($("account-login-form")){
   $("account-login-form").addEventListener("submit",async event=>{
     event.preventDefault();
     const email=$("account-login-email").value.trim();
     const button=$("account-login-button");
     if(!email||!$("account-login-email").checkValidity()){announce("Informe um e-mail válido.",true);return}
     button.disabled=true;announce("Enviando link de acesso...");
     try{
       const target=new URL("./conta.html",window.location.href);
       const {error}=await client.auth.signInWithOtp({
         email,options:{emailRedirectTo:target.href,shouldCreateUser:true}
       });
       if(error)throw error;
       announce("Confira sua caixa de entrada. Enviamos um link para acessar sua conta.");
     }catch(_error){announce("Não foi possível enviar o link agora. Verifique o e-mail e tente novamente.",true);}
     finally{button.disabled=false;}
   });
 }

 // Optional e-mail/password login. Magic Link remains available for first access and recovery.
 if($("account-password-login-form")){
   $("account-password-login-form").addEventListener("submit",async event=>{
     event.preventDefault();
     const emailInput=$("account-password-login-email"),secret=$("account-password-login-password"),button=$("account-password-login-button");
     if(!emailInput.checkValidity()||!secret.value){announce("Informe seu e-mail e sua senha.",true);return;}
     button.disabled=true;announce("Verificando acesso...");
     try{
       const {error}=await client.auth.signInWithPassword({email:emailInput.value.trim(),password:secret.value});
       secret.value="";
       if(error)throw error;
       await reload();announce("Sua conta está conectada.");
     }catch(_err){
       secret.value="";
       announce("Não foi possível entrar. Confira seus dados ou use o link por e-mail.",true);
     }finally{button.disabled=false;}
   });
 }
 // Passwords are sent only to Supabase Auth and never persisted in Editalume client storage.
 if($("account-password-form")){
   const passwordMessage=(message,error=false)=>{
     const node=$("account-password-status");node.textContent=message;
     node.classList.toggle("error",error);node.classList.toggle("success",!error);
   };
   $("account-password-form").addEventListener("submit",async event=>{
     event.preventDefault();
     if(!state.user){passwordMessage("Entre na sua conta antes de criar uma senha.",true);return;}
     const first=$("account-new-password"),confirmation=$("account-confirm-password"),button=$("account-password-button");
     if(first.value.length<12||first.value.length>72){passwordMessage("Use uma senha entre 12 e 72 caracteres.",true);return;}
     if(first.value!==confirmation.value){passwordMessage("As duas senhas não coincidem.",true);return;}
     button.disabled=true;passwordMessage("Salvando sua senha...");
     try{
       const {error}=await client.auth.updateUser({password:first.value});
       if(error)throw error;
       first.value="";confirmation.value="";
       passwordMessage("Senha salva! Agora você também pode entrar com e-mail e senha.");
     }catch(error){
       first.value="";confirmation.value="";
       if(/reauth|nonce|recent|current.password|not authenticated/i.test(error?.message||""))
         passwordMessage("Confirme sua identidade: saia, entre novamente pelo link de e-mail e tente outra vez.",true);
       else passwordMessage("Não foi possível salvar. Tente uma senha mais forte ou entre novamente pelo link.",true);
     }finally{button.disabled=false;}
   });
 }
 if($("account-import")){
   $("account-import").addEventListener("click",async()=>{
     if(!state.user)return;
     const pending=guestFavorites().filter(x=>!state.favorites.some(f=>f.pncp_id===x.pncp_id));
     const slots=Math.max(0,(state.pro?200:5)-state.favorites.length);
     if(!slots){announce("Seu limite de favoritos na nuvem já foi atingido.",true);return;}
     if(!window.confirm("Importar até "+Math.min(slots,pending.length)+" favoritos deste aparelho? Os originais serão mantidos."))return;
     const btn=$("account-import");btn.disabled=true;let imported=0;
     for(const item of pending.slice(0,slots)){
       try{await toggleFavorite(item);imported++}catch(_err){}
     }
     btn.disabled=false;
     announce(imported?imported+" favoritos importados. Mantivemos os originais neste dispositivo.":"Nenhum favorito foi importado. Alguns editais podem ter saído da amostra.",!imported);
   });
 }
 if($("account-logout")){
   $("account-logout").addEventListener("click",async()=>{
     const {error}=await client.auth.signOut();
     if(error){announce("Não foi possível encerrar a sessão.",true);return;}
     await reload();announce("Você saiu da conta.");
   });
 }
 // Auth client may restore a session following a Magic Link redirect.
 client.auth.onAuthStateChange(()=>{Promise.resolve().then(reload)});
 await reload();
})();
