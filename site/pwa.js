/* The Editalume worker is limited to this independent Editalume site. */
if("serviceWorker" in navigator){
 window.addEventListener("load",()=>{
   navigator.serviceWorker.register("./sw.js",{scope:"./",updateViaCache:"none"})
    .then(registration=>registration.update())
    .catch(()=>{/* The national search continues online if installation is unsupported. */});
 });
}
