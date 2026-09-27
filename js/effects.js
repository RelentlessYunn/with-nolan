/* ==========================================================
   effects.js — motion details, all in the astral style:
   · a ripple where you tap, and a pinch of stardust with it;
   · a burst of light when a task is ticked;
   · idle mode: after a while without touching anything, whatever moves by
     itself (the sky, sparkles) pauses to save battery.
   Settings decide how much of this runs: Animations = None turns it all
   off, Basic keeps only the ripple; the stardust and the ring of light
   also need Quality = High (fancy()).
   ========================================================== */
(function(){
  if(lowMotion()) return;

  /* ripple born where you tap */
  const RIPPLE=".p-card,.tour-start,.t-stop,.t-arrow,.p-back,.trow.tap,.n7-card,nav.bar a[data-tab],.d-nav,.d-today,.m-nav,.m-today,.ag-btn,.icon,#examFilters button,.mailbtn,.mailcopy,.seg button";
  document.addEventListener("pointerdown",e=>{
    const tgt=e.target.closest(RIPPLE); if(!tgt||tgt.disabled) return;
    const r=tgt.getBoundingClientRect(), d=Math.max(r.width,r.height)*2.2;
    const o=document.createElement("span");
    o.className="ripple";
    o.style.cssText=`width:${d}px;height:${d}px;left:${e.clientX-r.left-d/2}px;top:${e.clientY-r.top-d/2}px`;
    tgt.appendChild(o);
    setTimeout(()=>o.remove(),650);
    if(fancy()) stars(e.clientX,e.clientY,5,["#FFFFFF","#F1EEE3","#E3E6EF"],16,30,.6);
  },{passive:true});

  if(!fullMotion()) return;

  /* soft points of light drifting out from a point (fixed on screen) */
  function stars(x,y,n,colours,min,max,life){
    for(let i=0;i<n;i++){
      const p=document.createElement("i"), ang=Math.random()*Math.PI*2, dist=min+Math.random()*(max-min), size=3+Math.random()*5;
      p.className="stardust";
      p.style.cssText=`left:${x}px;top:${y}px;width:${size}px;height:${size}px;background:${colours[i%colours.length]};color:${colours[i%colours.length]};`+
        `--tx:${(Math.cos(ang)*dist).toFixed(1)}px;--ty:${(Math.sin(ang)*dist).toFixed(1)}px;--rot:${Math.round(Math.random()*180)}deg;--life:${life}s`;
      document.body.appendChild(p);
      setTimeout(()=>p.remove(),life*1000+80);
    }
  }

  /* a task ticked: sparks in its subject's colour and a ring of light */
  document.addEventListener("change",e=>{
    const inp=e.target;
    if(!inp.matches(".checkitem input[type=checkbox]")||!inp.checked) return;
    const r=inp.getBoundingClientRect(), x=r.left+r.width/2, y=r.top+r.height/2;
    const c=getComputedStyle(inp.closest(".checkitem")).getPropertyValue("--sc").trim()||"#3FD9A4";
    stars(x,y,highQuality()?16:8,[c,"#FFFFFF","#F4E6C8",c,"#FFFFFF"],24,64,.95);
    if(highQuality()){
      const ring=document.createElement("i");
      ring.className="nova"; ring.style.cssText=`left:${x}px;top:${y}px;--sc:${c}`;
      document.body.appendChild(ring); setTimeout(()=>ring.remove(),800);
    }
  });

  /* idle: after 2 minutes without input the decorations pause (long enough to just watch the sky) */
  const IDLE=120000;
  let timer=0;
  /* (not while just looking at the sky: that is the point of it) */
  const nap=()=>{ if(document.documentElement.classList.contains("viewing")){ timer=setTimeout(nap,IDLE); return; } document.body.classList.add("idle"); };
  const wake=()=>{
    if(document.body.classList.contains("idle")) document.body.classList.remove("idle");
    clearTimeout(timer); timer=setTimeout(nap,IDLE);
  };
  ["pointerdown","keydown","wheel","touchstart","scroll"].forEach(ev=>
    document.addEventListener(ev,wake,{passive:true,capture:true}));
  document.addEventListener("visibilitychange",()=>{ if(!document.hidden) wake(); });
  wake();
})();
