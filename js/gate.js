/* ==========================================================
   gate.js — the entry screen in front of everything.
   · At first it shows only Nolan's logo and, in the middle, the way in as a
     guest. The logo opens the PIN keypad (typing a digit on a keyboard
     opens it too; Escape closes it).
   · The PIN is never written in the code: only a PBKDF2 hash of it. The
     typed PIN is hashed the same way and compared.
   · Once the right PIN is typed on a device, that device remembers it
     (localStorage "nolan-device") and never asks again. Changing the PIN
     (a new hash here) makes every device ask again.
   · A guest (the button, or a link with ?guest) sees the whole site with a
     demo organizer instead of Nolan's data: index.html loads demo.js
     instead of data.js, eval.js and config.js, so nothing of Nolan's is
     loaded, read from the cloud or shown; no location is asked. It lasts
     this visit (sessionStorage "nolan-guest"); Settings has the way out,
     back to this screen. Coming in or out reloads the page.
   · index.html marks the page as locked (or guest) in <head> before
     painting, so nothing behind the gate ever flashes.
   · Right PIN (or guest): the keypad drifts away and the camera flies from
     deep space into the Nolan galaxy, which is home (universe.js).
   · Gate.lock() (Log out, in Settings) forgets the device and asks again.
   This keeps people out of the page; it does not hide the code or the data
   files, which are public in the repository (see README, "PIN").
   ========================================================== */
const Gate=(function(){
  const HASH="f9d8f1cd96a7b5ffd4c1f01c7f5f0a7c00940726b33625b4755a1d4f25a91f20";
  const SALT="nolan·with-nolan·2026", ROUNDS=150000, KEY="nolan-device", GUEST="nolan-guest", LEN=6;
  const root=document.documentElement, box=$("#gate");
  const locked=()=>root.hasAttribute("data-locked");
  const guest=()=>root.hasAttribute("data-guest");
  const listeners=[];
  if(!box) return {locked, guest, lock(){}, onOpen:fn=>fn(), onUnlock(){}};

  async function hash(pin){
    const enc=new TextEncoder();
    const key=await crypto.subtle.importKey("raw",enc.encode(pin),"PBKDF2",false,["deriveBits"]);
    const bits=await crypto.subtle.deriveBits({name:"PBKDF2",hash:"SHA-256",salt:enc.encode(SALT),iterations:ROUNDS},key,256);
    return [...new Uint8Array(bits)].map(b=>b.toString(16).padStart(2,"0")).join("");
  }

  const dots=$$("#gate .g-dot"), msg=$("#gateMsg"), logo=$("#gateLogo"), start=$("#gateStart"), padBox=$("#gatePad");
  let pin="", busy=false, leaving=false;
  function paint(){ dots.forEach((d,i)=>d.classList.toggle("on",i<pin.length)); }

  /* ---------- the keypad: shown by the logo, hidden again by it (or Escape) ---------- */
  const padOpen=()=>!padBox.hidden;
  function pad(on){
    if(busy||leaving||on===padOpen()) return;
    padBox.hidden=!on; start.hidden=on;
    box.classList.toggle("pad",on);
    logo.setAttribute("aria-expanded",String(on));
    if(!on){ pin=""; paint(); msg.textContent=""; }
  }
  logo.addEventListener("click",()=>pad(!padOpen()));

  function press(k){
    if(busy||leaving) return;
    if(k==="del"){ pin=pin.slice(0,-1); paint(); return; }
    if(pin.length>=LEN) return;
    pin+=k; paint(); msg.textContent="";
    if(pin.length===LEN) check();
  }
  async function check(){
    busy=true; box.classList.add("checking");
    let ok=false;
    try{ ok=(await hash(pin))===HASH; }catch(e){ ok=false; }
    box.classList.remove("checking");
    if(ok){ try{ localStorage.setItem(KEY,HASH); }catch(e){} open(); return; }
    /* wrong: the dots shake and empty */
    msg.textContent=t("gate.wrong");
    box.classList.remove("wrong"); void box.offsetWidth; box.classList.add("wrong");
    if(navigator.vibrate) navigator.vibrate([40,40,40]);
    setTimeout(()=>{ pin=""; paint(); busy=false; },450);
  }

  box.addEventListener("click",e=>{ const b=e.target.closest("[data-k]"); if(b) press(b.dataset.k); });
  $("#gateGuest").addEventListener("click",enterAsGuest);
  document.addEventListener("keydown",e=>{
    if(!locked()) return;
    if(/^[0-9]$/.test(e.key)){ pad(true); press(e.key); }
    else if(e.key==="Backspace"&&padOpen()) press("del");
    else if(e.key==="Escape"&&padOpen()){ e.preventDefault(); pad(false); }
  });

  /* ---------- in: the keypad drifts away and we travel into a galaxy ---------- */
  function open(){
    leaving=true;
    /* nothing of the keypad keeps its focus ring while it drifts away */
    if(document.activeElement&&box.contains(document.activeElement)) document.activeElement.blur();
    box.classList.add("granted");
    const done=()=>{ root.removeAttribute("data-locked"); box.hidden=true; box.classList.remove("granted","leaving"); leaving=false; listeners.forEach(fn=>fn()); };
    /* where the camera belongs: home's galaxy, or UC3M if a tab of the app was asked for */
    const to=Home.scene();
    if(!fancy()){ setTimeout(()=>{ Universe.go(to,{animate:false}); done(); },lowMotion()?300:450); return; }
    /* the digits, dots and logo float away one after another (css: .gate.leaving) */
    setTimeout(()=>{ if(!box.hidden) box.classList.add("leaving"); },350);
    root.classList.add("flying");                       /* the far stars fade in during the flight (css) */
    Universe.go(to,{duration:5600,arriveAt:.8,onArrive:()=>{ done(); setTimeout(()=>root.classList.remove("flying"),1500); }});
  }
  /* a guest: the page loads again with the demo organizer (demo.js) instead of Nolan's data, and the
     camera flies in from the Earth as after the PIN. Nothing is remembered but this visit */
  function enterAsGuest(){
    if(busy||leaving) return;
    leaving=true;
    try{ sessionStorage.setItem(GUEST,"1"); sessionStorage.setItem("nolan-fly","1"); }catch(e){}
    if(fancy()) box.classList.add("leaving");
    setTimeout(()=>{ location.hash="#home"; location.reload(); },fancy()?650:0);
  }

  /* ---------- log out (or leave guest mode): forget this device and show the entry again ---------- */
  function lock(){
    /* leaving guest mode: the page loads again, without the demo, at this screen */
    if(guest()){
      try{ sessionStorage.removeItem(GUEST); }catch(e){}
      /* (a change after # alone is no new page: it must load again) */
      history.replaceState(null,"",location.pathname+location.search.replace(/([?&])guest\b&?/,"$1").replace(/[?&]$/,"")+"#home"); location.reload(); return;
    }
    try{ localStorage.removeItem(KEY); sessionStorage.removeItem(GUEST); }catch(e){}
    root.removeAttribute("data-guest");
    busy=false; leaving=false; pad(false);
    box.classList.remove("granted","leaving","wrong","checking");
    box.hidden=false; box.classList.add("closing-in");
    root.setAttribute("data-locked","");
    /* next time, the flight lands at home (not on the page you logged out from) */
    history.replaceState(history.state,"","#home"); Home.open("home");
    Universe.go("gate",{animate:false});
    setTimeout(()=>box.classList.remove("closing-in"),900);
  }

  /* the version, as the footer says it (the one number to bump when publishing) */
  const ver=$("#gateVer"), foot=$("footer .version"); if(ver&&foot) ver.textContent=foot.textContent;

  /* already remembered on this device (or a guest in this visit): the gate is never shown */
  if(!locked()) box.hidden=true;

  return {locked, guest, lock,
    /* onOpen: now if already open, and again after every way in (PIN or guest) · onUnlock: only after one */
    onOpen:fn=>{ listeners.push(fn); if(!locked()) fn(); },
    onUnlock:fn=>{ listeners.push(fn); }};
})();
