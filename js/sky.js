/* ==========================================================
   sky.js — the sea of stars behind the whole page (#sky in index.html).
   · The stars are drawn once on canvases and used as background tiles,
     so the browser only moves images around: no drawing every frame.
   · Only used when the 3D universe (universe.js) cannot run (no WebGL2):
     then it draws the sky with CSS layers instead.
   · Layers: far dust, two sets of stars that twinkle out of step and a few
     bright stars with a soft bloom.
   · A film grain and a vignette give it a cinematic look.
   · With Animations = All: slow drift, twinkling, scroll parallax and a
     shooting star now and then. Basic and None leave the sky still, and
     Quality = Low leaves only a plain dark gradient.
   · Quality = Medium has its own sky of stars you can fly through (window.Stars).
   ========================================================== */
(function(){
  const sky=$("#sky"); if(!sky) return;
  if(SETTINGS.quality==="low") return;     /* low quality: a plain gradient, nothing to draw */
  if(SETTINGS.quality==="medium"){ simple(); return; }
  /* the 3D universe (universe.js) draws the whole sky itself: this one is only
     for devices without WebGL2 */
  if(document.documentElement.classList.contains("gl")) return;
  start();

  /* ---------- Quality = Medium: a sky of stars you can fly through (window.Stars) ----------
     Much lighter than the 3D universe: each place is one still picture of stars (small ones in
     real colours, a few brighter ones, a faint band of the Milky Way and faint clouds of gas),
     painted once. On home, each section is a bright coloured star where its galaxy would be.
     Opening a section moves smoothly forward into its star, into that section's own sky, where
     its star shines large; going home moves back out of it. One smooth move, no flare. universe.js hands its flights here when there is no 3D universe. */
  function simple(){
    const c=document.createElement("canvas"); c.className="sky-simple";
    sky.insertBefore(c,sky.firstChild);
    const x=c.getContext("2d");
    let W=0,H=0,DPR=1;
    const TINT=["255,255,255","255,250,242","226,234,255","205,220,255","255,236,214","255,214,184"];
    /* each section's star: its colour, where its galaxy sits seen from home */
    /* (from the galaxies' own definitions in galaxies.js: a new section only needs its "star" there) */
    const COL={};
    if(typeof Universe!=="undefined"){
      Object.entries(Universe.GALAXIES||{}).forEach(([k,g])=>{ if(g.star) COL[k]=g.star; });
      if(Universe.SIGHTS&&Universe.SIGHTS.bh&&Universe.SIGHTS.bh.star) COL.blackhole=Universe.SIGHTS.bh.star;
    }
    const SEC=Object.keys(COL);
    const posOf=id=>{
      const g=typeof Universe!=="undefined"&&(id==="blackhole"?Universe.SIGHTS&&Universe.SIGHTS.bh:Universe.GALAXIES&&Universe.GALAXIES[id]);
      const at=g?(W<760?g.at.m:g.at.d):[0,0];
      return [W/2+at[0]*W/2, H/2+at[1]*H/2];
    };
    /* a section's own star shines, once you are there, where it was seen from home: the dive flows into it */
    const sunOf=id=>posOf(id);
    const seedOf=id=>{ let h=2166136261; for(const ch of id) h=Math.imul(h^ch.charCodeAt(0),16777619); return (h>>>0)%4294967296||1; };

    /* one place's sky, painted once (a few kept at a time) */
    const cache=new Map();
    function field(id){
      if(cache.has(id)){ const f=cache.get(id); cache.delete(id); cache.set(id,f); return f; }
      const f=document.createElement("canvas"); f.width=Math.round(W*DPR); f.height=Math.round(H*DPR);
      const g=f.getContext("2d"); g.setTransform(DPR,0,0,DPR,0,0);
      let sd=id==="home"?20260924:seedOf(id); const rnd=()=>{ sd=(sd*1664525+1013904223)%4294967296; return sd/4294967296; };
      const tint=COL[id];
      /* faint clouds of gas (tinted by the section's star) */
      const clouds=[[.22,.3,"120,90,170"],[.78,.62,"150,80,110"],[.55,.12,"80,110,170"]].map(([fx,fy,col],k)=>tint&&k===0?[fx,fy,tint]:[fx+(id==="home"?0:rnd()*.3-.15),fy+(id==="home"?0:rnd()*.3-.15),col]);
      clouds.forEach(([fx,fy,col])=>{
        const R=Math.max(W,H)*(.35+rnd()*.2), gr=g.createRadialGradient(W*fx,H*fy,0,W*fx,H*fy,R);
        gr.addColorStop(0,`rgba(${col},.08)`); gr.addColorStop(.5,`rgba(${col},.028)`); gr.addColorStop(1,`rgba(${col},0)`);
        g.fillStyle=gr; g.fillRect(0,0,W,H);
      });
      /* a faint band across the sky, where the stars crowd */
      const ang=id==="home"?-.5:(rnd()-.5)*2.4, cx=W*(.35+rnd()*.3), cy=H*(.3+rnd()*.3), ca=Math.cos(ang), sa=Math.sin(ang), band=Math.min(W,H)*.16;
      g.save(); g.translate(cx,cy); g.rotate(ang);
      const bg=g.createLinearGradient(0,-band*1.6,0,band*1.6);
      bg.addColorStop(0,"rgba(190,200,240,0)"); bg.addColorStop(.5,"rgba(190,200,240,.045)"); bg.addColorStop(1,"rgba(190,200,240,0)");
      g.fillStyle=bg; g.fillRect(-W*1.5,-band*1.6,W*3,band*3.2); g.restore();
      const star=(px,py,r,a,t)=>{ g.fillStyle=`rgba(${t},${a})`; g.beginPath(); g.arc(px,py,r,0,Math.PI*2); g.fill(); };
      const n=Math.round(W*H/1100);
      for(let i=0;i<n;i++){
        let px=rnd()*W, py=rnd()*H;
        if(i%3===0){ const u=(rnd()-.5)*W*1.6, v=(rnd()+rnd()+rnd()-1.5)*band*.8; px=cx+u*ca-v*sa; py=cy+u*sa+v*ca; }
        star(px,py,.35+Math.pow(rnd(),3)*.75,(.18+Math.pow(rnd(),2)*.7).toFixed(2),TINT[Math.floor(rnd()*TINT.length)]);
      }
      /* a few brighter ones, with a small soft glow */
      for(let i=0;i<Math.round(n/70);i++){
        const px=rnd()*W, py=rnd()*H, t=TINT[Math.floor(rnd()*TINT.length)], R=4+rnd()*5;
        const gr=g.createRadialGradient(px,py,0,px,py,R);
        gr.addColorStop(0,`rgba(${t},.5)`); gr.addColorStop(.25,`rgba(${t},.14)`); gr.addColorStop(1,`rgba(${t},0)`);
        g.fillStyle=gr; g.beginPath(); g.arc(px,py,R,0,Math.PI*2); g.fill();
        star(px,py,.9+rnd()*.5,.95,"255,255,255");
      }
      cache.set(id,f);
      while(cache.size>3) cache.delete(cache.keys().next().value);
      return f;
    }
    /* a bright star: a wide soft halo, a glow and a hot white core */
    function glow(g,px,py,R,t,a){
      let gr=g.createRadialGradient(px,py,0,px,py,R*3);
      gr.addColorStop(0,`rgba(${t},${.2*a})`); gr.addColorStop(1,`rgba(${t},0)`);
      g.fillStyle=gr; g.beginPath(); g.arc(px,py,R*3,0,Math.PI*2); g.fill();
      gr=g.createRadialGradient(px,py,0,px,py,R);
      gr.addColorStop(0,`rgba(255,255,255,${Math.min(1,.95*a)})`); gr.addColorStop(.18,`rgba(${t},${.8*a})`); gr.addColorStop(.5,`rgba(${t},${.22*a})`); gr.addColorStop(1,`rgba(${t},0)`);
      g.fillStyle=gr; g.beginPath(); g.arc(px,py,R,0,Math.PI*2); g.fill();
    }
    const starR=()=>W<760?13:18;
    /* a place's sky drawn scaled about a point (s: scale, a: opacity). Smaller than the screen it
       repeats around itself, so the screen is never left without stars. Added light on light:
       two skies crossing keep the same brightness all the way */
    function place(id,s,px,py,a){
      if(a<=0) return;
      x.globalAlpha=Math.min(1,a); x.globalCompositeOperation="lighter";
      const f=field(id);
      x.setTransform(DPR*s,0,0,DPR*s,DPR*px*(1-s),DPR*py*(1-s));
      if(s<1){ for(let i=-1;i<=1;i++) for(let j=-1;j<=1;j++) x.drawImage(f,i*W,j*H,W,H); }
      else x.drawImage(f,0,0,W,H);
      /* on home, the sections' stars; in a section, its own star, large and near */
      if(id==="home") SEC.forEach(k=>{ const [qx,qy]=posOf(k); glow(x,qx,qy,starR(),COL[k],1); });
      else if(COL[id]){ const [sx,sy]=sunOf(id); glow(x,sx,sy,Math.min(W,H)*.075,COL[id],1); }
      x.setTransform(DPR,0,0,DPR,0,0); x.globalAlpha=1; x.globalCompositeOperation="source-over";
    }
    const sm=(a,b,v)=>{ const t=Math.min(1,Math.max(0,(v-a)/(b-a))); return t*t*(3-2*t); };
    let scene="home", fl=null, raf=0;
    function paint(now){
      raf=0;
      x.setTransform(DPR,0,0,DPR,0,0); x.globalAlpha=1;
      x.fillStyle="#030407"; x.fillRect(0,0,W,H);
      if(!fl){ place(scene,1,W/2,H/2,1); return; }
      const p=Math.min(1,(now-fl.t0)/fl.ms);
      /* one smooth move, forward into the star or back out of it: both skies scale the same way,
         so it never pulls back, and nothing flares */
      const e=p<.5?4*p*p*p:1-Math.pow(-2*p+2,3)/2;
      const k=sm(.2,.8,p);                                 /* one sky gives way to the other: together always full */
      if(fl.from==="home"&&COL[fl.to]){
        const [px,py]=posOf(fl.to);
        place("home",1+2.6*e,px,py,1-k);
        place(fl.to,.62+.38*e,px,py,k);
      } else if(fl.to==="home"&&COL[fl.from]){
        const [px,py]=posOf(fl.from);
        place(fl.from,1-.38*e,px,py,1-k);
        place("home",3.6-2.6*e,px,py,k);
      } else {
        place(fl.from,1+.2*e,W/2,H/2,1-k);
        place(fl.to,.85+.15*e,W/2,H/2,k);
      }
      if(!fl.reached&&p>=fl.arriveAt) arrive(fl);
      if(p>=1){ fl=null; paint(now); return; }
      raf=requestAnimationFrame(paint);
    }
    function arrive(f){ if(f.reached) return false; f.reached=true; f.also.forEach(fn=>fn()); return true; }
    const kick=()=>{ if(!raf) raf=requestAnimationFrame(paint); };
    function size(){
      W=innerWidth; H=innerHeight; DPR=Math.min(devicePixelRatio||1,W<760?2:1.5);
      c.width=Math.round(W*DPR); c.height=Math.round(H*DPR);
      cache.clear(); kick();
    }
    window.Stars={
      /* true: this sky handles the flight (and calls onArrive) */
      go(to,{animate=true,from,onArrive,onCancel}={}){
        /* the sights of the 3D universe have no star of their own here (the black hole aside): they live in home's sky */
        if(to==="gate"||(!COL[to]&&to!=="home")) to="home";
        if(fl&&fl.to===to){ if(onArrive) fl.also.push(onArrive); if(onCancel) fl.cancels.push(onCancel); return true; }
        const was=fl; fl=null;
        if(was){ was.cancels.forEach(fn=>fn()); }
        const src=was?was.to:scene;
        scene=to;
        /* after the PIN: no flight here, the keypad drifts away and home is simply there */
        if(from==="gate"){ kick(); if(onArrive) setTimeout(onArrive,900); return true; }
        if(!animate||!fullMotion()||src===to){ kick(); if(onArrive) onArrive(); return true; }
        /* quicker than the 3D flights */
        field(to); field(src);                           /* painted before the move starts, not in the middle of it */
        fl={from:src,to,t0:performance.now(),ms:1050,arriveAt:.7,reached:false,also:onArrive?[onArrive]:[],cancels:onCancel?[onCancel]:[]};
        kick(); return true;
      },
      /* a click during the flight: what waits for it shows now, the flight goes on */
      skip:()=>!!fl&&arrive(fl),
      busy:()=>!!fl,
      scene:()=>scene
    };
    if(typeof Universe!=="undefined"){ const s0=Universe.scene(); scene=COL[s0]||s0==="home"?s0:s0==="uc3m"?"uc3m":"home"; }
    size();
    c.classList.add("ready");
    let rz=0; window.addEventListener("resize",()=>{ clearTimeout(rz); rz=setTimeout(size,250); });
  }

  function start(){
  const DPR=Math.min(window.devicePixelRatio||1,2);
  /* the same sky on every visit: a small seeded random generator */
  let seed=20260921;
  const rnd=()=>{ seed=(seed*1664525+1013904223)%4294967296; return seed/4294967296; };
  const pick=a=>a[Math.floor(rnd()*a.length)];
  /* real star colours, by temperature: mostly white, some blue-white, some warm */
  const TINTS=["255,255,255","255,255,255","255,252,245","228,236,255","206,222,255","255,240,220","255,222,190","255,204,170"];

  /* one tile of stars → object URL, set as the layer's background */
  function tile(size,count,{min,max,alpha,spikes=0}){
    const c=document.createElement("canvas"), x=c.getContext("2d");
    c.width=c.height=Math.round(size*DPR); x.scale(DPR,DPR);
    for(let i=0;i<count;i++){
      const px=rnd()*size, py=rnd()*size, r=min+Math.pow(rnd(),2.2)*(max-min), a=alpha[0]+rnd()*(alpha[1]-alpha[0]), tint=pick(TINTS);
      /* soft halo, then the core */
      const g=x.createRadialGradient(px,py,0,px,py,r*3.2);
      g.addColorStop(0,`rgba(${tint},${a})`); g.addColorStop(.35,`rgba(${tint},${a*.35})`); g.addColorStop(1,`rgba(${tint},0)`);
      x.fillStyle=g; x.beginPath(); x.arc(px,py,r*3.2,0,Math.PI*2); x.fill();
      x.fillStyle=`rgba(255,255,255,${Math.min(1,a+.15)})`; x.beginPath(); x.arc(px,py,r*.55,0,Math.PI*2); x.fill();
    }
    /* a few bright stars: a wide soft bloom and a tiny hot core, like through a lens */
    for(let i=0;i<spikes;i++){
      const px=rnd()*size, py=rnd()*size, R=6+rnd()*9, tint=pick(TINTS);
      const g=x.createRadialGradient(px,py,0,px,py,R);
      g.addColorStop(0,`rgba(${tint},.55)`); g.addColorStop(.12,`rgba(${tint},.22)`); g.addColorStop(.4,`rgba(${tint},.06)`); g.addColorStop(1,`rgba(${tint},0)`);
      x.fillStyle=g; x.beginPath(); x.arc(px,py,R,0,Math.PI*2); x.fill();
      x.fillStyle="rgba(255,255,255,.98)"; x.beginPath(); x.arc(px,py,1.1+rnd()*.6,0,Math.PI*2); x.fill();
    }
    return new Promise(res=>c.toBlob(b=>res(URL.createObjectURL(b))));
  }
  const LAYERS=[
    /* class,    tile, stars, sizes and brightness */
    ["l-dust",   520, 520, {min:.2, max:.55,alpha:[.12,.4]}],
    ["l-a",      760, 120, {min:.4, max:1.1,alpha:[.45,.9]}],
    ["l-b",      820, 120, {min:.4, max:1.1,alpha:[.45,.9]}],
    ["l-bright",1200,  30, {min:.7, max:1.5,alpha:[.6,1], spikes:9}]
  ];
  LAYERS.forEach(([cls,size,count,opt])=>{
    const el=sky.querySelector("."+cls); if(!el) return;
    el.style.setProperty("--tile",size+"px");
    tile(size,count,opt).then(url=>{ el.style.backgroundImage=`url(${url})`; el.classList.add("ready"); });
  });

  /* film grain: a small tile of noise, drawn once */
  const grain=sky.querySelector(".sky-grain");
  if(grain){
    const c=document.createElement("canvas"), x=c.getContext("2d"), N=160;
    c.width=c.height=N; const img=x.createImageData(N,N);
    for(let i=0;i<img.data.length;i+=4){ const v=Math.random()*255; img.data[i]=img.data[i+1]=img.data[i+2]=v; img.data[i+3]=255; }
    x.putImageData(img,0,0);
    c.toBlob(b=>{ grain.style.backgroundImage=`url(${URL.createObjectURL(b)})`; });
  }

  /* ---------- parallax: deeper layers move less when you scroll ---------- */
  const pars=$$("#sky [data-depth]");
  const canvas=$("body > div.wrap");
  let raf=0;
  function parallax(){
    raf=0;
    if(!fancy()){ pars.forEach(p=>p.style.transform=""); return; }
    const y=Math.max(window.scrollY,canvas?canvas.scrollTop:0);
    pars.forEach(p=>{
      const depth=+p.dataset.depth, tileSize=+p.dataset.tile||0;
      let off=y*depth;
      off=tileSize?off%tileSize:Math.min(off,150);          /* tiles repeat; the band has 150px to spare */
      p.style.transform=`translate3d(0,${-off.toFixed(1)}px,0)`;
    });
  }
  const onScroll=()=>{ if(!raf) raf=requestAnimationFrame(parallax); };
  window.addEventListener("scroll",onScroll,{passive:true});
  if(canvas) canvas.addEventListener("scroll",onScroll,{passive:true});

  /* ---------- shooting stars ---------- */
  const meteors=sky.querySelector(".sky-meteors");
  function meteor(){
    if(!document.hidden&&fancy()&&!document.body.classList.contains("idle")){
      const m=document.createElement("i");
      m.className="meteor";
      /* anywhere on the screen, heading anywhere: it starts at a random point and
         flies towards another one, so each one crosses the sky differently */
      const W=innerWidth, H=innerHeight;
      const x0=W*(.05+Math.random()*.9), y0=H*(.05+Math.random()*.8);
      let x1=W*(.1+Math.random()*.8), y1=H*(.1+Math.random()*.8);
      if(Math.hypot(x1-x0,y1-y0)<Math.min(W,H)*.3){ x1=W-x0; y1=H-y0; }        /* not too short a trip */
      const ang=Math.atan2(y1-y0,x1-x0)*180/Math.PI;
      const dist=Math.min(Math.hypot(x1-x0,y1-y0),220+Math.random()*420);
      /* its head is its right end: place that end at the start point */
      const len=90+Math.random()*110;
      m.style.width=len+"px"; m.style.left=(x0-len)+"px"; m.style.top=y0+"px";
      m.style.setProperty("--a",ang.toFixed(1)+"deg");
      m.style.setProperty("--d",dist.toFixed(0)+"px");
      m.style.setProperty("--t",(.8+dist/700+Math.random()*.3).toFixed(2)+"s");
      m.addEventListener("animationend",()=>m.remove());
      meteors.appendChild(m);
    }
    setTimeout(meteor,5000+Math.random()*9000);
  }
  setTimeout(meteor,4000);
  }
})();
