/* ==========================================================
   prefs.js — user settings (language, and Effects: animations and quality together), saved on this
   device. index.html reads them in <head> before painting (so there is
   no flash of the wrong look) and leaves them in window.SETTINGS.
   There is only the dark, starry look: the light theme was removed in v0.52.
   ========================================================== */
const SETTINGS_KEY="settings";
const SETTINGS_DEFAULTS={lang:"en",motion:"full",quality:"high",scroll:"smooth"};          /* English by default; Spanish in Settings */
const SETTINGS_OPTIONS={lang:["es","en"],motion:["full","basic","none"],quality:["high","medium","low"],scroll:["smooth","native"]};
const SETTINGS=Object.assign({},SETTINGS_DEFAULTS,window.SETTINGS||{});
Object.keys(SETTINGS_OPTIONS).forEach(k=>{ if(!SETTINGS_OPTIONS[k].includes(SETTINGS[k])) SETTINGS[k]=SETTINGS_DEFAULTS[k]; });

const systemReduced=()=>matchMedia("(prefers-reduced-motion:reduce)").matches;
/* nothing moves: "none" in Settings or reduced motion in the system */
const lowMotion=()=>SETTINGS.motion==="none"||systemReduced();
/* decorations too (stars, stardust, counters): only with "full" */
const fullMotion=()=>SETTINGS.motion==="full"&&!systemReduced();
/* high quality: the 3D universe, glass, glows. Medium: the same look with a plain sky of
   simple stars instead of the universe. Low: plain background and nothing heavy */
const highQuality=()=>SETTINGS.quality==="high";
/* the showy extras (stardust, warp, shooting stars) need both */
const fancy=()=>fullMotion()&&highQuality();

/* Effects: one choice in Settings, which sets both how much moves and how heavy the look is */
/* High: the living 3D universe. Medium: a sky of stars, where each section is a bright star the
   camera flies into (Stars, in sky.js). Minimal: a plain background, nothing moves */
const LOOKS={high:{motion:"full",quality:"high"}, medium:{motion:"full",quality:"medium"}, low:{motion:"none",quality:"low"}};
/* the level the saved settings amount to (older devices may have any pair: by the quality) */
const currentLook=()=>LOOKS[SETTINGS.quality]?SETTINGS.quality:"high";

/* saves one setting. Language re-renders everything, so the page reloads. */
function saveSetting(key,value){
  if(key==="look"){
    const L=LOOKS[value]; if(!L) return;
    const changed=currentLook()!==value||SETTINGS.motion!==L.motion||SETTINGS.quality!==L.quality;
    Object.assign(SETTINGS,L);
    try{ localStorage.setItem(SETTINGS_KEY,JSON.stringify(SETTINGS)); }catch(e){}
    if(changed){ if(typeof Shift!=="undefined") Shift.leave("look"); else location.reload(); }
    return;
  }
  if(!SETTINGS_OPTIONS[key]||!SETTINGS_OPTIONS[key].includes(value)) return;
  const changed=SETTINGS[key]!==value;
  SETTINGS[key]=value;
  try{ localStorage.setItem(SETTINGS_KEY,JSON.stringify(SETTINGS)); }catch(e){}
  if(!changed) return;
  /* these change the whole page: it reloads, through the passage of shift.js */
  if(key==="lang"||key==="motion"||key==="quality"){ if(typeof Shift!=="undefined") Shift.leave(key); else location.reload(); return; }
  emit("settings",{key,value});
}
