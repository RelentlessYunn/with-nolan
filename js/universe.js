/* ==========================================================
   universe.js — one universe for the whole app, in real 3D, drawn by the
   graphics card (WebGL2) on a canvas (#universe) behind everything.
   · Home is the Nolan galaxy: you arrive there after the PIN, flying in
     from deep space. Every section is another galaxy you can see from
     home; entering a section flies the camera into it.
   · The sights (PLACES): the Earth, the Moon, the black hole, the home
     galaxy and the wonders of wonders.js can each be flown to and looked
     at whole, one by one (home.js lists them).
   · Nothing is recalculated frame by frame on the processor. Everything
     is an exact formula of time that the graphics card evaluates:
       – every star follows its own orbit, an ellipse turned a little more
         the further out it is (the density-wave model of spiral galaxies,
         Lin & Shu; the arms appear where the ellipses crowd together and
         stay there while the stars flow through them); inner stars turn
         faster than outer ones;
       – pink star-forming regions light up only while they cross an arm
         (where the orbits squeeze together) and fade as they leave it;
       – bulges are swarms of stars on orbits in every direction, and
         globular clusters circle each galaxy in 3D.
   · Each disk is a real volume. Its light and dust are painted once on the
     graphics card as a map (from the same orbits), a small cube of 3D noise
     is made once, and every ray walks through the disk: old stars in a
     thick flared layer, young ones in a thin one, dust in clouds with a 3D
     shape. The dust darkens what lies behind it, so dust lanes cross the
     near side of a bulge and an edge-on galaxy shows its dark band. Bulges
     are real 3D volumes, and a faint stellar halo surrounds each galaxy.
   · The far sky: thousands of stars, a faint nebula (painted once on the
     graphics card), dozens of tiny far galaxies, stars scattered through
     space that stretch into streaks when the camera flies, shooting stars
     and comets with their two tails, sometimes several at once.
   · The camera floats and slowly turns around what it looks at (and, with a
     mouse, leans a little towards the pointer), so every galaxy is seen from
     changing angles and near things move against far ones: the depth shows.
   · Light is added up like in a camera (high dynamic range) and then
     developed with a soft curve and a faint glow around bright things.
   · Budget: fewer stars and a lower resolution on phones; the galaxies' volumes
     (soft light and dust) at half the resolution; the resolution also adapts if
     the device struggles. Nothing is drawn behind the passage of shift.js. Nothing is drawn while the tab
     is hidden, and life pauses after a while without touching anything.
   · Universe.go(scene, {animate, duration, onArrive, onCancel}) moves the
     camera (the longer the way, the longer the flight, unless a duration is
     given). Without animations it simply jumps and everything stands still.
     Universe.skip() shows at once what waits for a flight, which flies on; Universe.ready() says whether
     everything is built and on the screen (the passage of shift.js waits).
   · Only with Quality = High. Without WebGL2 (or with Medium or Low) there is
     no universe: sky.js draws a simpler sky instead (or none).
   ========================================================== */
const Universe=(function(){
  const cv=$("#universe");
  const HQ=highQuality();
  const root=document.documentElement;
  const TAU=Math.PI*2;

  /* ---------- how much to draw ----------
     robot: automated tests (a software GPU); ?tier=phone or ?tier=desk forces one */
  const phone=matchMedia("(max-width:760px),(pointer:coarse)").matches;
  const TIERS={
    robot:{k:.07,map:256,scale:.4,maxScale:.5,steps:[4,8],far:1500,field:500,bloom:false,neb:256,band:256,bandStars:300,gc:20,vol:1},
    phone:{k:.36,map:1024,scale:.8,maxScale:1.5,steps:[8,20],far:5000,field:900,bloom:true,neb:640,band:2048,bandStars:3500,gc:60,vol:.5},
    desk:{k:1,map:2048,scale:1,maxScale:1.5,steps:[12,30],far:9000,field:1400,bloom:true,neb:1024,band:2800,bandStars:9000,gc:130,vol:.5}};
  const asked=(location.search.match(/[?&]tier=(robot|phone|desk)\b/)||[])[1];
  const robot=!asked&&!!navigator.webdriver;
  const TIER=TIERS[asked||(robot?"robot":phone?"phone":"desk")];

  /* ---------- the galaxies: what each one is made of, in galaxies.js ---------- */
  const {GALAXIES, COMPANIONS}=UNIVERSE_GALAXIES;
  const IDS=Object.keys(GALAXIES);
  /* the other wonders of the sky (nebulae, a cluster, colliding galaxies…), each described in wonders.js,
     which registers them in window.UNIVERSE_EXTRAS before this file runs. Each one has its own
     fragment shaders (drawn on a screen quad, SPRITE_VS), a place, and a draw() called every frame
     with the api below: "far" before the galaxies, "near" after them */
  const EXTRAS=window.UNIVERSE_EXTRAS||[];
  /* the black hole, seen from home (at and z as for the galaxies) and a scene of its own
     ("blackhole": the camera flies straight up to it). R radius of its shadow; its disk leans
     open radians out of edge-on and turns roll on the screen, so it is seen a little from above
     both from home and up close */
  const unit=v=>{ const l=Math.hypot(...v); return v.map(x=>x/l); };
  const SIGHTS={
    bh:{star:"255,120,210", at:{d:[-.36,-.28],m:[-.45,-.1]}, z:90, R:1.5, open:.25, roll:-.1}};
  /* the sights: places you can fly to and look at whole, one by one (home.js lists them, in its
     own order). Each is {p: where it is, R: how big it looks (world units), k: a closer or wider
     look}: the black hole, three galaxies (home's Whirlpool, the ring galaxy, the edge-on one), and the wonders of wonders.js, which
     bring their own (x.sights, placed by their layout). Filled by layout(). */
  const PLACES={};
  /* the galaxies that are sights: which one, and how much of it to frame (R: share of its size;
     the edge-on one is as wide as its whole disk) */
  const SIGHT_GALAXIES={whirlpool:{g:"nolan",R:.9}, ringgalaxy:{g:"ringgalaxy",R:.9}, edgeon:{g:"edgeon",R:1.3}};
  /* every sight's name, known before anything is laid out (the address may ask for one) */
  const sightIds=()=>["blackhole",...Object.keys(SIGHT_GALAXIES),...EXTRAS.flatMap(x=>(x.sights||[]).map(s=>s.id))];

  /* ---------- the camera and the scenes ----------
     scenes: "gate" (deep space, behind the Earth), "home", a galaxy of a section, or a sight (PLACES) */
  let W=0,H=0,F=1;                   /* css px, focal length in px */
  let base={x:0,y:0,z:0};            /* where the camera stands (flights move it) */
  let cam={x:0,y:0,z:0};             /* …plus its gentle float: what is drawn */
  let prevCam=null;                  /* for the streaks while flying */
  let scene=null, anim=null;
  const world={};                    /* per galaxy: centre, size, orientation */

  function layout(){
    W=cv.clientWidth||innerWidth; H=cv.clientHeight||innerHeight; F=Math.min(W,H)*1.15;
    const small=W<760;
    IDS.forEach(id=>{
      const g=GALAXIES[id], at=small?g.at.m:g.at.d;
      world[id]=frame(g,at[0]*(W/2)/F*g.z, at[1]*(H/2)/F*g.z, g.z, g.r*3, g.tilt, g.roll);
    });
    COMPANIONS.forEach(c=>{
      const h=world[c.host];
      const o=mul3(h.M,c.off);
      world[c.id]=frame(c,h.cx+o[0],h.cy+o[1],h.cz+o[2],h.R*c.size,c.tilt,c.roll);
    });
    Object.values(SIGHTS).forEach(s=>{ const at=small?s.at.m:s.at.d; s.p=[at[0]*(W/2)/F*s.z, at[1]*(H/2)/F*s.z, s.z]; });
    EXTRAS.forEach(x=>{ if(x.layout) x.layout(api); });
    const bh=SIGHTS.bh, co=Math.cos(bh.open), so=Math.sin(bh.open);
    bh.n=unit([co*Math.sin(bh.roll),-co*Math.cos(bh.roll),-so]);
    /* the sights: the black hole with its whole disk (it reaches 19 of the hole's own radii),
       a galaxy with its arms, and each wonder as big as it is drawn */
    PLACES.blackhole={p:bh.p,R:bh.R*3.6};
    Object.entries(SIGHT_GALAXIES).forEach(([k,s])=>{ const w=world[s.g]; PLACES[k]={p:[w.cx,w.cy,w.cz],R:w.R*s.R,turn:.6}; });
    EXTRAS.forEach(x=>(x.sights||[]).forEach(s=>{ if(s.p) PLACES[s.id]={p:s.p,R:s.R,k:s.k}; }));
  }
  /* a galaxy's frame: local (u,v,w) → world = centre + R · aim · roll · tilt · (u,v,w).
     tilt and roll say how it looks seen from home; "aim" turns it towards home's
     camera, so a galaxy high on the screen is not seen from below instead */
  function frame(g,cx,cy,cz,R,tilt,roll){
    const ct=Math.cos(tilt), st=Math.sin(tilt), cr=Math.cos(roll), sr=Math.sin(roll);
    const d0=Math.hypot(cx,cy,cz), dx=cx/d0, dy=cy/d0, dz=cz/d0;
    /* rotation taking the view axis (0,0,1) to the direction of the galaxy (Rodrigues) */
    const ax=-dy, ay=dx, s=Math.hypot(ax,ay), c=dz;
    const aim=v=>{
      if(s<1e-6) return v;
      const kx=ax/s, ky=ay/s, dot=kx*v[0]+ky*v[1];
      const cx_=ky*v[2], cy_=-kx*v[2], cz_=kx*v[1]-ky*v[0];             /* k × v (k has no z) */
      return [v[0]*c+cx_*s+kx*dot*(1-c), v[1]*c+cy_*s+ky*dot*(1-c), v[2]*c+cz_*s];
    };
    /* columns of roll·tilt (images of u, v, w), then aimed */
    const cu=aim([cr,sr,0]), cvv=aim([-sr*ct,cr*ct,st]), cw=aim([sr*st,-cr*st,ct]);
    const M=[cu[0]*R,cu[1]*R,cu[2]*R, cvv[0]*R,cvv[1]*R,cvv[2]*R, cw[0]*R,cw[1]*R,cw[2]*R];   /* column-major 3×3 */
    /* inverse (rows = the unit columns, divided by R) */
    const Inv=[cu[0]/R,cvv[0]/R,cw[0]/R, cu[1]/R,cvv[1]/R,cw[1]/R, cu[2]/R,cvv[2]/R,cw[2]/R];
    const Rot=[cu[0],cvv[0],cw[0], cu[1],cvv[1],cw[1], cu[2],cvv[2],cw[2]];                   /* world dir → local dir */
    return {g,cx,cy,cz,R,M,Inv,Rot};
  }
  const mul3=(m,v)=>[m[0]*v[0]+m[3]*v[1]+m[6]*v[2], m[1]*v[0]+m[4]*v[1]+m[7]*v[2], m[2]*v[0]+m[5]*v[1]+m[8]*v[2]];
  /* 3×3 matrices (column-major): a·b */
  const mat3=(a,b)=>{ const o=new Array(9); for(let c=0;c<3;c++) for(let r=0;r<3;r++) o[c*3+r]=a[r]*b[c*3]+a[3+r]*b[c*3+1]+a[6+r]*b[c*3+2]; return o; };
  /* a world point in the camera's frame: x right, y down, z ahead */
  const toCam=(p,c,R)=>{ const d=[p[0]-c.x,p[1]-c.y,p[2]-c.z]; return [R[0]*d[0]+R[1]*d[1]+R[2]*d[2], R[3]*d[0]+R[4]*d[1]+R[5]*d[2], R[6]*d[0]+R[7]*d[1]+R[8]*d[2]]; };
  /* a world point on the screen: css px and depth (null: behind the camera) */
  const onScreen=p=>{ const q=toCam(p,cam,camR); return q[2]>1?[W/2+q[0]*F/q[2],H/2+q[1]*F/q[2],q[2]]:null; };

  function camFor(s){
    if(s==="gate") return {x:0,y:0,z:-430};
    const pl=PLACES[s];
    if(pl&&pl.p) return sightView(pl);
    if(s==="home"||!GALAXIES[s]||!world[s]) return {x:0,y:0,z:0};
    const w=world[s], r=w.R;
    /* close to the galaxy, a little off its centre: the core glows high on the right, over the header;
       on a phone the core sits nearer the middle so the galaxy stays in view */
    return W<760?{x:w.cx-r*.3, y:w.cy+r*1.1, z:w.cz-r*1.9}:{x:w.cx-r*.7, y:w.cy+r*.45, z:w.cz-r*1.9};
  }
  /* a sight, whole: its radius fills a set share of the screen's shorter side, its centre a
     little above the middle (its words sit below; on a short screen it is smaller and higher).
     The camera looks along +z, like home's, or (turn, for a galaxy) part of the way along home's
     own line of sight to it, so it is seen much as it was designed to be seen from home; never
     all the way, or the edge of the screen would reach past the far stars. The turn (yaw, pitch;
     no roll) puts the centre at (0, ty) on the screen, as in orbit(): camera coordinates
     (0, ty, 1)/L lie in world direction (sin yaw·k, sin(a − pitch), cos yaw·k), a = atan ty, k > 0 */
  function sightView(pl){
    const small=W<760, short=H<620;
    const fit=(small?.4:short?.22:.29)*(pl.k||1), D=pl.R*F/(fit*Math.min(W,H));
    const ty=-(small?.1:short?.16:.12)*H/F;
    const g=unit(pl.p), k=pl.turn||0, dir=unit([g[0]*k,g[1]*k,1-k+g[2]*k]);
    const yaw=Math.atan2(dir[0],dir[2]), pitch=Math.atan(ty)-Math.asin(Math.max(-1,Math.min(1,dir[1])));
    return {x:pl.p[0]-dir[0]*D, y:pl.p[1]-dir[1]*D, z:pl.p[2]-dir[2]*D, yaw, pitch};
  }
  /* the camera's axes (columns) for a yaw about the vertical and then a pitch about the horizontal */
  function turn(yaw,pitch){
    const cy=Math.cos(yaw), sy=Math.sin(yaw), cp=Math.cos(pitch), sp=Math.sin(pitch);
    return [cy,0,-sy, sy*sp,cp,cy*sp, sy*cp,-sp,cy*cp];
  }
  function startScene(){
    if(root.hasAttribute("data-locked")) return "gate";
    const h=decodeURIComponent(location.hash.slice(1));
    if(sightIds().includes(h)) return h;
    return !h||/^(home|notes|settings|nolan|soon|inicio|notas|ajustes|configuracion)/.test(h)?"home":"uc3m";
  }

  /* ---------- life: time that only runs while the universe is alive ---------- */
  let life=0;
  let scrolledAt=0;
  /* the passage of shift.js covers the whole screen (fully opaque): nothing here can be seen */
  const hidden=()=>root.classList.contains("shift-dark");
  let scrollEnd=0;
  window.addEventListener("scroll",()=>{ scrolledAt=performance.now(); clearTimeout(scrollEnd); scrollEnd=setTimeout(()=>kick(),280); },{passive:true,capture:true});
  /* (automated tests: no life, so their fake clocks never have to draw thousands of frames) */
  const alive=()=>!robot&&fancy()&&!document.hidden&&!hidden()&&!document.body.classList.contains("idle");
  /* the camera turns slowly around what it looks at, so the galaxies are seen from
     changing angles and their depth shows (home: around a point among them; a section:
     around its galaxy, which stays in the same place on the screen). With a mouse it
     also leans a little towards the pointer. Both fade out during flights. */
  let camR=[1,0,0, 0,1,0, 0,0,1];    /* the camera's axes in the world (columns) */
  let orbitK=0, orbitAt="home";
  const ptr={x:0,y:0,tx:0,ty:0};
  const finePointer=matchMedia("(pointer:fine)").matches;
  if(finePointer&&!robot){
    window.addEventListener("pointermove",e=>{ ptr.tx=e.clientX/innerWidth*2-1; ptr.ty=e.clientY/innerHeight*2-1; },{passive:true});
    document.addEventListener("mouseleave",()=>{ ptr.tx=0; ptr.ty=0; });
  }
  function steer(dt){
    if(!fancy()){ orbitK=anim?0:1; if(!anim) orbitAt=scene; ptr.x=ptr.y=0; return; }
    orbitK+=((anim?0:1)-orbitK)*Math.min(1,dt*(anim?3:.45));
    if(!anim) orbitAt=scene;                             /* the new centre once there (the turn has faded by then) */
    const k=Math.min(1,dt*1.6);
    ptr.x+=(ptr.tx-ptr.x)*k; ptr.y+=(ptr.ty-ptr.y)*k;
  }
  function pivotFor(s){
    if(GALAXIES[s]&&world[s]) return [world[s].cx,world[s].cy,world[s].cz];
    if(PLACES[s]&&PLACES[s].p) return PLACES[s].p;
    return [base.x,base.y,base.z+80];
  }
  function orbit(){
    const t=life, a=Math.min(1,life/10)*orbitK, sec=GALAXIES[orbitAt]||PLACES[orbitAt]?1:0;
    if(orbitAt==="gate") return null;
    /* at a sight it goes further round, and sooner: the thing you came to look at is seen from one side,
       then the other, so its depth shows (about a minute for each swing) */
    const sight=PLACES[orbitAt]?1:0;
    const yaw=a*(sight?.3:sec?.15:.075)*(Math.sin(t*(sight?.1:.052))*.8+Math.sin(t*.021+1.3)*.2)-ptr.x*.045*orbitK;
    const pitch=a*(sight?.13:sec?.07:.04)*Math.sin(t*(sight?.075:.039)+.7)+ptr.y*.03*orbitK;
    if(Math.abs(yaw)+Math.abs(pitch)<1e-6) return null;
    const cp=Math.cos(pitch), sp=Math.sin(pitch), cy=Math.cos(yaw), sy=Math.sin(yaw);
    /* R = turn about the vertical (yaw) · turn about the horizontal (pitch) */
    return {R:[cy,0,-sy, sy*sp,cp,cy*sp, sy*cp,-sp,cy*cp], P:pivotFor(orbitAt)};
  }
  /* the camera floats: slow, never quite repeating */
  function float(){
    const t=life, a=Math.min(1,life/6);
    return {x:a*(Math.sin(t*.061)*.9+Math.sin(t*.147)*.25), y:a*(Math.cos(t*.053)*.55+Math.sin(t*.119)*.18), z:a*Math.sin(t*.043)*1.4};
  }

  /* ---------- seeded random numbers ---------- */
  function rng(seed){ let s=(seed*2654435761)>>>0||1; return ()=>{ s^=s<<13; s^=s>>>17; s^=s<<5; return (s>>>0)/4294967296; }; }
  const gauss=r=>{ let u=0; for(let i=0;i<4;i++) u+=r(); return (u-2)/1.1547; };
  /* colour of a star from its temperature (Kelvin), 0..1 */
  function kelvin(T){
    const t=T/100; let r,g,b;
    if(t<=66){ r=255; g=99.47*Math.log(t)-161.12; b=t<=19?0:138.52*Math.log(t-10)-305.04; }
    else { r=329.7*Math.pow(t-60,-.1332); g=288.12*Math.pow(t-60,-.0755); b=255; }
    const c=v=>Math.max(0,Math.min(255,v))/255;
    return [c(r),c(g),c(b)];
  }

  /* ======================================================================
     the graphics card
     ====================================================================== */
  let gl=null, lost=false, ok=false;
  let P={};                          /* shader programs */
  let RW=1,RH=1, scale=1, maxScale=1;/* render size (device px) and px per css px */
  let hdr=null, bloomA=null, bloomB=null, volT=null, half=false, checkedHalf=false;
  let pointMax=64;
  const G={};                        /* per galaxy: buffers, map, ready time */
  let far=null, field=null, deepBuf=null, nebTex=null, band=null, meteorBuf=null, noiseTex=null;
  let emptyVAO=null;

  /* the graphics card's programs: GLSL text, in shaders.js */
  const {HEAD, NOISE, FULL_VS, MAP_FS, PART_VS, PART_FS, VOL_FS, FAR_VS, DOT_FS, NEBGEN_FS, BANDGEN_FS, DUST_FS, NEB_VS, NEB_FS, DEEP_VS, DEEP_FS, FIELD_VS, FIELD_FS, MET_VS, MET_FS, COMET_VS, COMET_FS, HOLE_FS, BRIGHT_FS, BLUR_FS, CARD_FS, UP_FS, COMP_FS, SPRITE_VS}=UNIVERSE_SHADERS;

  /* ---------- small helpers ---------- */
  /* programs are compiled in the background (the page does not wait for them) and
     finished — checked, their settings looked up — once they are ready */
  function compile(vs,fs){
    const mk=(type,src)=>{ const s=gl.createShader(type); gl.shaderSource(s,src); gl.compileShader(s); return s; };
    const p=gl.createProgram(), a=mk(gl.VERTEX_SHADER,vs), b=mk(gl.FRAGMENT_SHADER,fs);
    gl.attachShader(p,a); gl.attachShader(p,b); gl.linkProgram(p);
    return {p,u:null,sh:[a,b]};
  }
  function finish(pr){
    if(!gl.getProgramParameter(pr.p,gl.LINK_STATUS))
      throw new Error((pr.sh.map(x=>gl.getShaderInfoLog(x)).join(" ")+" "+gl.getProgramInfoLog(pr.p)).trim());
    const u={}, n=gl.getProgramParameter(pr.p,gl.ACTIVE_UNIFORMS);
    for(let i=0;i<n;i++){ const inf=gl.getActiveUniform(pr.p,i); u[inf.name.replace(/\[0\]$/,"")]=gl.getUniformLocation(pr.p,inf.name); }
    pr.u=u; pr.sh.forEach(x=>gl.deleteShader(x)); pr.sh=[];
  }
  /* waits for every program, asking without blocking when the device allows it */
  function whenCompiled(done,fail){
    const ext=gl.getExtension("KHR_parallel_shader_compile"), t0=performance.now();
    const check=()=>{
      if(lost) return;
      const all=Object.values(P).every(pr=>!ext||gl.getProgramParameter(pr.p,ext.COMPLETION_STATUS_KHR));
      if(!all&&performance.now()-t0<8000){ setTimeout(check,30); return; }
      try{
        /* a wonder that does not compile is left out; the rest of the universe goes on */
        Object.entries(P).forEach(([k,pr])=>{ if(!pr.extra) return;
          try{ finish(pr); pr.extra.ready=true; pr.extra.readyAt=-1e9; }catch(e){ pr.extra.broken=true; delete P[k]; console.warn("universe: wonder",pr.extra.id,"left out:",e.message); } });
        Object.values(P).forEach(pr=>{ if(!pr.u) finish(pr); }); done();
      }catch(e){ fail(e); }
    };
    check();
  }
  function texture(w,h,fmt,filter){
    const t=gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D,t);
    if(fmt==="half") gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA16F,w,h,0,gl.RGBA,gl.HALF_FLOAT,null);
    else gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA8,w,h,0,gl.RGBA,gl.UNSIGNED_BYTE,null);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,filter||gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    return t;
  }
  /* check: ask the graphics card whether it can draw into it (a pause for the page, so only
     for the high-range picture, whose format is the one that may be missing) */
  function target(w,h,fmt,check){
    const t=texture(w,h,fmt), f=gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER,f); gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,t,0);
    if(check&&gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE) throw new Error("framebuffer");
    return {t,f,w,h};
  }
  function drop(tg){ if(!tg) return; gl.deleteTexture(tg.t); gl.deleteFramebuffer(tg.f); }
  function buffer(data){ const b=gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER,b); gl.bufferData(gl.ARRAY_BUFFER,data,gl.STATIC_DRAW); return b; }
  function attrib(loc,buf,size,type,norm,stride,off,div){
    gl.bindBuffer(gl.ARRAY_BUFFER,buf); gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc,size,type,norm,stride,off); if(div) gl.vertexAttribDivisor(loc,div);
  }
  const full=()=>{ gl.bindVertexArray(emptyVAO); gl.drawArrays(gl.TRIANGLES,0,3); };

  /* ---------- starting the graphics card ---------- */
  function initGL(){
    gl=cv.getContext("webgl2",{alpha:false,antialias:false,depth:false,stencil:false,premultipliedAlpha:true,preserveDrawingBuffer:false,powerPreference:"default"});
    if(!gl) return false;
    half=!!gl.getExtension("EXT_color_buffer_float");
    pointMax=gl.getParameter(gl.ALIASED_POINT_SIZE_RANGE)[1]||64;
    emptyVAO=gl.createVertexArray();
    return true;
  }
  function compileAll(){
    P.map=compile(FULL_VS,MAP_FS);
    P.part=compile(PART_VS,PART_FS);
    P.vol=compile(FULL_VS,VOL_FS);
    P.far=compile(FAR_VS,DOT_FS);
    P.nebgen=compile(FULL_VS,NEBGEN_FS);
    P.neb=compile(NEB_VS,NEB_FS);
    P.bandgen=compile(FULL_VS,BANDGEN_FS);
    P.dust=compile(NEB_VS,DUST_FS);
    P.deep=compile(DEEP_VS,DEEP_FS);
    P.field=compile(FIELD_VS,FIELD_FS);
    P.met=compile(MET_VS,MET_FS);
    P.comet=compile(COMET_VS,COMET_FS);
    P.hole=compile(SPRITE_VS,HEAD+HOLE_FS.slice(HEAD.length));
    P.card=compile(SPRITE_VS,CARD_FS);
    P.bright=compile(FULL_VS,BRIGHT_FS);
    P.blur=compile(FULL_VS,BLUR_FS);
    P.comp=compile(FULL_VS,COMP_FS);
    P.up=compile(FULL_VS,UP_FS);
    /* the wonders wait until the universe is on the screen (compiling them all at once held the
       page back), except the Earth, where every way in starts */
    /* (always: every way in, the PIN, a guest's reload, the first opening, flies from the Earth, and it
       used to wait at the end of the queue after a reload, so the flight passed an empty sky) */
    EXTRAS.forEach(x=>{ x.ready=false; x.prog={}; if(x.early) compileExtra(x,P); });
    laterExtras();
  }
  function compileExtra(x,into){
    Object.entries(x.shaders||{}).forEach(([k,fs])=>{ const pr=x.prog[k]=compile(SPRITE_VS,HEAD+NOISE+fs); pr.extra=x; if(into) into["x_"+x.id+"_"+k]=pr; });
  }
  /* then one wonder at a time, in the background, each drawn as soon as it is ready */
  let extrasGen=0;
  function laterExtras(){
    const gen=++extrasGen, ext=gl.getExtension("KHR_parallel_shader_compile");
    const todo=EXTRAS.filter(x=>!x.broken&&!Object.keys(x.prog).length);
    const step=()=>{
      if(gen!==extrasGen||lost||dead) return;
      if(!ok||!ready()){ setTimeout(step,250); return; }
      const x=todo.shift(); if(!x) return;
      compileExtra(x);
      const prs=Object.values(x.prog), t0=performance.now();
      const check=()=>{
        if(gen!==extrasGen||lost) return;
        if(ext&&performance.now()-t0<8000&&!prs.every(pr=>gl.getProgramParameter(pr.p,ext.COMPLETION_STATUS_KHR))){ setTimeout(check,40); return; }
        /* it fades in (as a galaxy does), instead of popping into the sky, unless nobody is looking yet */
        try{ prs.forEach(finish); x.readyAt=fancy()&&!robot&&!covering()?performance.now():-1e9; x.ready=true; need(); }
        catch(e){ x.broken=true; console.warn("universe: wonder",x.id,"left out:",e.message); }
        setTimeout(step,60);
      };
      check();
    };
    setTimeout(step,0);
  }
  /* the render size: css size × pixels per css px (adapts to the device) */
  function sizeTargets(){
    const nw=Math.max(1,Math.round(W*scale)), nh=Math.max(1,Math.round(H*scale));
    if(hdr&&nw===RW&&nh===RH) return;
    RW=nw; RH=nh; cv.width=RW; cv.height=RH;
    drop(hdr); drop(bloomA); drop(bloomB); drop(volT); volT=null;
    if(half&&!checkedHalf){
      /* the first time: can this device draw into half-float pictures? if not, 8 bits */
      try{ drop(target(4,4,"half",true)); }catch(e){ half=false; }
      checkedHalf=true;
    }
    const fmt=half?"half":"rgba8";
    hdr=target(RW,RH,fmt);
    const bw=Math.max(1,RW>>2), bh=Math.max(1,RH>>2);
    bloomA=target(bw,bh,fmt); bloomB=target(bw,bh,fmt);
    if(TIER.vol<1) volT=target(Math.ceil(RW*TIER.vol),Math.ceil(RH*TIER.vol),fmt);
  }

  /* ---------- 3D clouds: smooth noise that repeats, made once ----------
     (three layers of smoothly blended random values, from coarse to fine).
     Only the three grids of random values go to the graphics card (4³, 8³ and 16³: a
     few kilobytes, always at hand in its cache) and it blends them itself for every
     sample: a 64³ cube of the finished noise was read all over at random by the rays
     and cost most of the frame. Here the cube is only measured, for its range. */
  function buildNoise(S){
    const r=rng(777), acc=new Float32Array(S*S*S), lats=[];
    const fade=t=>t*t*(3-2*t);
    let amp=1;
    for(const c of [4,8,16]){
      const lat=new Float32Array(c*c*c); for(let i=0;i<lat.length;i++) lat[i]=Math.round(r()*255)/255;   /* (as the 8-bit grid will hold it, so the range measured below is exact) */
      lats.push({c,lat});
      const L=(x,y,z)=>lat[((z%c)*c+(y%c))*c+(x%c)];
      for(let z=0;z<S;z++){ const fz=z*c/S, z0=Math.floor(fz), wz=fade(fz-z0);
        for(let y=0;y<S;y++){ const fy=y*c/S, y0=Math.floor(fy), wy=fade(fy-y0);
          for(let x=0;x<S;x++){ const fx=x*c/S, x0=Math.floor(fx), wx=fade(fx-x0);
            const a=L(x0,y0,z0)+(L(x0+1,y0,z0)-L(x0,y0,z0))*wx, b=L(x0,y0+1,z0)+(L(x0+1,y0+1,z0)-L(x0,y0+1,z0))*wx;
            const c2=L(x0,y0,z0+1)+(L(x0+1,y0,z0+1)-L(x0,y0,z0+1))*wx, d=L(x0,y0+1,z0+1)+(L(x0+1,y0+1,z0+1)-L(x0,y0+1,z0+1))*wx;
            const e=a+(b-a)*wy, f=c2+(d-c2)*wy;
            acc[(z*S+y)*S+x]+=amp*(e+(f-e)*wz);
          } } }
      amp*=.5;
    }
    /* stretch the values over the whole range, so clouds have clear edges */
    let lo=1e9, hi=-1e9; for(const v of acc){ if(v<lo) lo=v; if(v>hi) hi=v; }
    /* 8 bits a value (the values run 0..1): every graphics card blends these itself. Half-float grids
       (R16F) were only blended by some: phones that cannot (the same ones as UP_FS) read each cell as a
       flat block, and the edge-on galaxy's dust came out in stairs of hard squares */
    const tex=lats.map(({c,lat})=>{
      const t=gl.createTexture(); gl.bindTexture(gl.TEXTURE_3D,t);
      const u8=new Uint8Array(lat.length); for(let i=0;i<lat.length;i++) u8[i]=Math.round(Math.min(1,Math.max(0,lat[i]))*255);
      gl.pixelStorei(gl.UNPACK_ALIGNMENT,1);
      gl.texImage3D(gl.TEXTURE_3D,0,gl.R8,c,c,c,0,gl.RED,gl.UNSIGNED_BYTE,u8);
      gl.pixelStorei(gl.UNPACK_ALIGNMENT,4);
      gl.texParameteri(gl.TEXTURE_3D,gl.TEXTURE_MIN_FILTER,gl.LINEAR); gl.texParameteri(gl.TEXTURE_3D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
      [gl.TEXTURE_WRAP_S,gl.TEXTURE_WRAP_T,gl.TEXTURE_WRAP_R].forEach(k=>gl.texParameteri(gl.TEXTURE_3D,k,gl.REPEAT));
      return t;
    });
    gl.bindTexture(gl.TEXTURE_3D,null);
    /* where the grids sit (the cube's texel centres) and how to stretch the sum over 0..1 */
    return {tex,off:.5/S,lo,k:1/(hi-lo)};
  }

  /* ---------- the far sky: built once ---------- */
  /* where the band crosses home's sky: on a computer a low arch behind the interface, seen on
     both sides and under the clock; on a phone a long diagonal. In shares of half the screen */
  function bandShape(){
    const asp=W/H, narrow=W<760;
    return narrow?{curve:[-.05,-.45,.04,0],w:.12,heart:.45,asp,hb:2.8}:{curve:[.12,-.2,.16,1],w:.16,heart:-.85*asp,asp,hb:2};
  }
  function buildSky(){
    noiseTex=buildNoise(robot?24:phone?48:64);
    const r=rng(20260921);
    /* stars at infinity, in the cone the camera can see; then the band's own crowd of faint stars */
    const bs=bandShape(), nb=TIER.bandStars||0, n0=TIER.far, n=n0+nb, S=new Float32Array(n*4), C=new Uint8Array(n*4);
    for(let i=n0;i<n;i++){
      let t,u,k=0;
      do{ t=(r()*2-1)*1.5; u=(r()+r()+r()-1.5)*1.25; k++; }                /* thickest in the middle */
      while(k<6&&r()>.3+.7*Math.pow(.5+.5*Math.sin(t*5.3+1.1)*Math.sin(t*2.1+u*1.7),1.5));   /* in clouds */
      const c0=bs.curve, mid=c0[0]+c0[1]*t+c0[2]*t*t;
      const fx=c0[3]<.5?mid+u*bs.w/bs.asp:t, fy=c0[3]<.5?t:mid+u*bs.w;
      const v=unit([fx*(W/2)/F,fy*(H/2)/F,1]);
      S[i*4]=v[0]; S[i*4+1]=v[1]; S[i*4+2]=v[2]; S[i*4+3]=Math.pow(r(),4.5)*.85;
      const c=kelvin(r()<.25?3400+r()*1500:4800+r()*4000);
      C[i*4]=c[0]*255; C[i*4+1]=c[1]*255; C[i*4+2]=c[2]*255; C[i*4+3]=r()<.05?255:0;
    }
    for(let i=0;i<n0;i++){
      const z=.55+.45*r(), a=r()*TAU, s=Math.sqrt(1-z*z);
      S[i*4]=Math.cos(a)*s; S[i*4+1]=Math.sin(a)*s; S[i*4+2]=z;
      S[i*4+3]=Math.pow(r(),5.5);                            /* most are faint, a few bright */
      const c=kelvin(r()<.12?9000+r()*14000:r()<.3?3200+r()*1800:5000+r()*2800);
      C[i*4]=c[0]*255; C[i*4+1]=c[1]*255; C[i*4+2]=c[2]*255; C[i*4+3]=r()<.12?255:0;
    }
    far={n,vao:gl.createVertexArray()};
    gl.bindVertexArray(far.vao);
    attrib(0,buffer(S),4,gl.FLOAT,false,0,0); attrib(1,buffer(C),4,gl.UNSIGNED_BYTE,true,0,0);
    /* stars scattered through the space the camera flies through */
    const m=TIER.field, FS=new Float32Array(m*4);
    for(let i=0;i<m;i++){ FS[i*4]=(r()-.5)*300; FS[i*4+1]=(r()-.5)*200; FS[i*4+2]=-440+r()*620; FS[i*4+3]=.25+r()*.7; }
    field={n:m,vao:gl.createVertexArray()};
    gl.bindVertexArray(field.vao);
    attrib(0,buffer(FS),4,gl.FLOAT,false,0,0,1);
    /* tiny far galaxies */
    const d=46, DP=new Float32Array(d*4), DA=new Float32Array(d*4), DC=new Uint8Array(d*4);
    for(let i=0;i<d;i++){
      DP[i*4]=(r()-.5)*380; DP[i*4+1]=(r()-.5)*260; DP[i*4+2]=230+r()*200; DP[i*4+3]=1.6+Math.pow(r(),2)*5;
      const type=r()<.55?0:r()<.5?1:2;
      DA[i*4]=type===2?1.45:.2+r()*1.1; DA[i*4+1]=r()*TAU; DA[i*4+2]=type; DA[i*4+3]=r();
      const c=r()<.5?[.62,.74,1]:[.78,.72,1];
      DC[i*4]=c[0]*255; DC[i*4+1]=c[1]*255; DC[i*4+2]=c[2]*255; DC[i*4+3]=(.35+r()*.5)*255;
    }
    deepBuf={n:d,vao:gl.createVertexArray()};
    gl.bindVertexArray(deepBuf.vao);
    attrib(0,buffer(DP),4,gl.FLOAT,false,0,0,1); attrib(1,buffer(DA),4,gl.FLOAT,false,0,0,1); attrib(2,buffer(DC),4,gl.UNSIGNED_BYTE,true,0,0,1);
    /* shooting stars: a small buffer rewritten when one appears */
    meteorBuf={b:gl.createBuffer(),vao:gl.createVertexArray(),data:new Float32Array(8*8)};
    gl.bindVertexArray(meteorBuf.vao);
    gl.bindBuffer(gl.ARRAY_BUFFER,meteorBuf.b); gl.bufferData(gl.ARRAY_BUFFER,meteorBuf.data,gl.DYNAMIC_DRAW);
    attrib(0,meteorBuf.b,4,gl.FLOAT,false,32,0,1); attrib(1,meteorBuf.b,4,gl.FLOAT,false,32,16,1);
    gl.bindVertexArray(null);
    /* the nebula, painted once */
    const nw=TIER.neb, nh=Math.round(nw*.62);
    const tg=target(nw,nh,"rgba8");
    gl.viewport(0,0,nw,nh); gl.disable(gl.BLEND);
    gl.useProgram(P.nebgen.p); gl.uniform2f(P.nebgen.u.uAsp,nw/nh,1); full();
    nebTex=tg.t; gl.deleteFramebuffer(tg.f);
    paintBand();
  }
  /* the band, painted once (again only if the screen changes shape), a little larger than the screen around home */
  function paintBand(){
    const bs=bandShape(), HB=bs.hb, side=Math.min(TIER.band,gl.getParameter(gl.MAX_TEXTURE_SIZE)||2048), bw=W>=H?side:Math.round(side*W/H), bh=W>=H?Math.round(side*H/W):side;
    if(band) gl.deleteTexture(band.t);
    const tb=target(bw,bh,"rgba8");
    gl.viewport(0,0,bw,bh); gl.disable(gl.BLEND);
    const u=P.bandgen.u; gl.useProgram(P.bandgen.p);
    gl.uniform2f(u.uHalf,HB,HB); gl.uniform4f(u.uCurve,...bs.curve); gl.uniform3f(u.uBand,bs.w,bs.heart,bs.asp); full();
    band={t:tb.t,hb:HB,hx:HB*(W/2)/F*1400,hy:HB*(H/2)/F*1400,W,H}; gl.deleteFramebuffer(tb.f);
  }

  /* ---------- a galaxy: its stars and its map, built when its turn comes ----------
     The stars are worked out in a background worker (tens of thousands of them: on the
     page that would freeze it for a moment), then handed to the graphics card; the map
     is painted in strips, a little each turn, so neither the page nor the graphics card
     ever stalls for long (a flight, or the passage of shift.js, keeps moving). */
  function starData(g,k,gcMembers){
    const r=rng(g.seed*977+13), st=g.stars, d=g.disk;
    const cnt={old:Math.round((st.old||0)*k), young:Math.round((st.young||0)*k), hii:Math.round((st.hii||0)*Math.max(k,.25)),
               cloud:d?Math.round((st.young||0)*.12*Math.max(k,.3)):0,
               bulge:Math.round((st.bulge||0)*k), halo:Math.round((st.halo||0)*k), gc:Math.max(0,Math.round((st.gc||0)*Math.max(k,.4))),
               ring:d&&d.ring&&d.ring.stars?Math.round(d.ring.stars*Math.max(k,.3)):0};
    const total=cnt.old+cnt.young+cnt.cloud+cnt.hii+cnt.bulge+cnt.halo+cnt.ring+cnt.gc*gcMembers;
    const A=new Float32Array(total*4), B=new Float32Array(total*4), O=new Float32Array(total*3), C=new Uint8Array(total*4);
    let i=0;
    const put=(a,th,z,kind,lum,spd,inc,node,col,ox,oy,oz)=>{
      A[i*4]=a; A[i*4+1]=th; A[i*4+2]=z; A[i*4+3]=kind;
      B[i*4]=lum; B[i*4+1]=spd; B[i*4+2]=inc; B[i*4+3]=node;
      O[i*3]=ox||0; O[i*3+1]=oy||0; O[i*3+2]=oz||0;
      C[i*4]=col[0]*255; C[i*4+1]=col[1]*255; C[i*4+2]=col[2]*255; C[i*4+3]=255; i++;
    };
    const tint=(c,t,m)=>[c[0]*(1-m)+t[0]*m,c[1]*(1-m)+t[1]*m,c[2]*(1-m)+t[2]*m];
    /* how far out: thinning smoothly towards the rim (a sharp end there lined the outermost orbits up into a
       visible circle round the disk) */
    const thin=(a,a0,a1)=>{ const x=Math.min(1,Math.max(0,(a-a0)/(a1-a0))); return x*x*(3-2*x); };
    const radius=(h,min,a0=.72,a1=1.3)=>{ let a; do{ a=-h*Math.log(Math.max(1e-9,r()*r())); }while(a>1.3||a<(min||0)||r()<thin(a,a0,a1)); return a; };
    if(d){
      for(let n=0;n<cnt.old;n++){
        const a=radius(d.h);
        put(a,r()*TAU,gauss(r)*d.hz*(.8+a*.9),0,.01+Math.pow(r(),30)*1.8,1,0,0,tint(kelvin(3400+r()*3400),g.col.old,.35));
      }
      for(let n=0;n<cnt.young;n++){
        const a=radius(d.young.h,d.rc*.7,.5,1.08);
        put(a,r()*TAU,gauss(r)*d.hz*.5,1,.3+Math.pow(r(),2.5)*3.2,1,0,0,tint(kelvin(9000+r()*16000),g.col.young,.3));
      }
      /* clouds of young stars along the arms: soft blue patches, some above and below the disk */
      for(let n=0;n<cnt.cloud;n++){
        const a=radius(d.young.h,d.rc,.5,1.08);
        put(a,r()*TAU,gauss(r)*d.hz*.9,1,(.25+r()*.6)*g.gain.young,1,0,0,tint(kelvin(12000+r()*12000),g.col.young,.5),.008+Math.pow(r(),2)*.022);
      }
      /* a ring galaxy: young blue stars crowded in the ring, a few of them bright */
      /* most of them in clusters round the ring, the rest scattered along it */
      const knots=[...Array(26)].map(()=>r()*TAU);
      for(let n=0;n<cnt.ring;n++){
        const inKnot=r()<.65, a=Math.max(.05,d.ring.a+gauss(r)*d.ring.w*(inKnot?.35:.6));
        const th=inKnot?knots[Math.floor(r()*knots.length)]+gauss(r)*.07:r()*TAU;
        put(a,th,gauss(r)*d.hz*.5,0,.2+Math.pow(r(),3)*1.8,1,0,0,tint(kelvin(11000+r()*15000),g.col.young,.35));
      }
      for(let n=0;n<cnt.hii;n++){
        const a=radius(d.young.h,d.rc,.5,1.08);
        put(a,r()*TAU,gauss(r)*d.hz*.3,2,(.5+r()*.8)*(g.gain.hii||.4),1,0,0,g.col.hii,.006+r()*.014);
      }
    }
    const bq=g.bulge.q;
    for(let n=0;n<cnt.bulge;n++){
      /* distances roughly following the bulge's light */
      let a; do{ a=g.bulge.Rb*Math.pow(-Math.log(Math.max(1e-9,r()*r()*r())),g.bulge.n*.55)*.55; }while(a>1.2);
      put(a,r()*TAU,bq[2],3,.01+Math.pow(r(),40)*1.5,(r()<.5?-1:1)*(.6+r()*.8),Math.acos(1-2*r()),r()*TAU,tint(kelvin(3300+r()*2600),g.col.core,.25));
    }
    for(let n=0;n<cnt.halo;n++){
      const a=.22+Math.pow(r(),1.7)*1.15;         /* thinning outwards: thicker out there showed as a round shell */
      put(a,r()*TAU,1,3,.02+Math.pow(r(),8)*1.4,.4+r()*.4,Math.acos(1-2*r()),r()*TAU,kelvin(3600+r()*2400));
    }
    for(let c=0;c<cnt.gc;c++){
      /* a globular cluster: a tight ball of old stars on its own inclined orbit */
      const a=.35+r()*1.05, th=r()*TAU, inc=Math.acos(1-2*r()), node=r()*TAU, spd=.35+r()*.3, rad=.012+r()*.012;
      for(let m=0;m<gcMembers;m++){
        const rr=rad*Math.pow(r(),1.6), u=2*r()-1, ph=r()*TAU, s=Math.sqrt(1-u*u);
        put(a,th,1,4,.08+Math.pow(r(),3)*.7,spd,inc,node,kelvin(3500+r()*2800),rr*s*Math.cos(ph),rr*s*Math.sin(ph),rr*u);
      }
    }
    return {n:i,A,B,O,C};
  }
  /* the worker: these same functions, sent as text (if there is no worker, on the page) */
  const stars=(function(){
    let w=null, seq=0; const waiting={};
    try{
      const src=`const TAU=Math.PI*2; ${rng.toString()} const gauss=${gauss.toString()}; ${kelvin.toString()} ${starData.toString()}
        onmessage=e=>{ const o=starData(e.data.g,e.data.k,e.data.m); postMessage({id:e.data.id,o},[o.A.buffer,o.B.buffer,o.O.buffer,o.C.buffer]); };`;
      w=new Worker(URL.createObjectURL(new Blob([src],{type:"text/javascript"})));
      w.onmessage=e=>{ const j=waiting[e.data.id]; delete waiting[e.data.id]; if(j) j.res(e.data.o); };
      /* a worker that fails: what it had is done on the page, and so is everything after */
      w.onerror=()=>{ w=null; Object.keys(waiting).forEach(id=>{ const j=waiting[id]; delete waiting[id]; j.res(starData(j.g,j.k,j.m)); }); };
    }catch(e){ w=null; }
    return (g,k,m)=>{
      if(!w) return Promise.resolve(starData(g,k,m));
      const id=++seq;
      return new Promise(res=>{ waiting[id]={res,g,k,m}; w.postMessage({id,g,k,m}); });
    };
  })();
  function mapUniforms(d,g){
    const u=P.map.u; gl.useProgram(P.map.p);
    gl.uniform1f(u.uB,1.35);
    gl.uniform4f(u.uEll,d.rc,d.ex1,d.ex2,d.twist); gl.uniform2f(u.uPhi0,d.phi0,d.logS||0);
    gl.uniform4f(u.uDisk,d.h,d.young.h,d.dust.h,d.warp);
    gl.uniform4f(u.uArm,d.young.k,d.hii.c1,d.hii.c2,d.dust.k);
    gl.uniform4f(u.uMisc,d.floc,d.dust.lag,0,g.seed*1.37);
    const ring=d.ring||{a:0,w:0,light:0,dust:0};
    gl.uniform4f(u.uRing,ring.a,ring.w,ring.light,ring.dust);
    gl.uniform4f(u.uMax,4,10,10,5);
  }
  /* the steps that build one galaxy: each one small (a step may return a promise, and
     gets the queue, so it can put more steps at its front) */
  function buildGalaxy(id,g){
    const d=g.disk, e={};
    const steps=[()=>stars(g,TIER.k,TIER.gc).then(o=>{
      if(!gl||lost) return;
      e.n=o.n; e.vao=gl.createVertexArray(); e.bufs=[buffer(o.A),buffer(o.B),buffer(o.O),buffer(o.C)];
      gl.bindVertexArray(e.vao);
      attrib(0,e.bufs[0],4,gl.FLOAT,false,0,0); attrib(1,e.bufs[1],4,gl.FLOAT,false,0,0);
      attrib(2,e.bufs[2],3,gl.FLOAT,false,0,0); attrib(3,e.bufs[3],4,gl.UNSIGNED_BYTE,true,0,0);
      gl.bindVertexArray(null);
    })];
    /* the disk's map, painted on the graphics card in strips of about 512×512 pixels */
    if(d){
      let S=0, tg=null;
      steps.push(q=>{
        /* as sharp as this screen needs (and no more: less memory on smaller screens) */
        const need=Math.ceil(Math.max(W,H)*Math.min(devicePixelRatio||1,1.5)*1.25/256)*256;
        const big=Math.max(512,Math.min(TIER.map,need));
        S=id==="nolan"||id==="uc3m"?big:Math.max(256,big>>1);
        tg=target(S,S,"rgba8");
        const rows=Math.max(64,Math.floor(262144/S)), strips=[];
        for(let y0=0;y0<S;y0+=rows){
          const h=Math.min(rows,S-y0);
          strips.push(()=>{
            gl.bindFramebuffer(gl.FRAMEBUFFER,tg.f); gl.viewport(0,0,S,S); gl.disable(gl.BLEND);
            mapUniforms(d,g);
            gl.enable(gl.SCISSOR_TEST); gl.scissor(0,y0,S,h); full(); gl.disable(gl.SCISSOR_TEST);
          });
        }
        q.unshift(...strips);
      });
      steps.push(()=>{
        gl.bindTexture(gl.TEXTURE_2D,tg.t);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);
        gl.generateMipmap(gl.TEXTURE_2D);
        e.map=tg.t; e.mapSize=S; gl.deleteFramebuffer(tg.f);
      });
    }
    steps.push(q=>{
      e.at=fancy()&&!robot&&!covering()?performance.now():-1e9;   /* fades in, unless nobody is looking yet */
      G[id]=e;
      if(!robot||!q.length) need();                       /* (automated tests: one frame at the end) */
    });
    return steps;
  }
  /* one small step per turn, so the page never stutters: home's galaxy first */
  let queue=[], building=0;
  /* behind the passage of shift.js (a setting just changed) nobody sees the page yet: build
     at full speed, so everything is there, still, when the passage opens */
  const covering=()=>root.classList.contains("shift-arriving");
  const idle=fn=>covering()?setTimeout(fn,0):window.requestIdleCallback?requestIdleCallback(fn,{timeout:700}):setTimeout(fn,60);
  function buildNext(){
    if(!gl||lost) return;
    const job=queue.shift(); if(!job) return;
    const round=building, next=()=>{ if(round===building&&queue.length) idle(buildNext); };
    let r=null;
    try{ r=job(queue); }catch(e){ console.warn("universe:",e); }
    if(r&&r.then) r.then(next,e=>{ console.warn("universe:",e); next(); }); else next();
  }
  /* when the page has settled: never in the middle of the first clicks */
  function startBuilding(){
    queue=[]; building++;
    IDS.forEach(id=>queue.push(q=>{ q.unshift(...buildGalaxy(id,GALAXIES[id])); }));
    COMPANIONS.forEach(c=>queue.push(q=>{ q.unshift(...buildGalaxy(c.id,c)); }));
    let started=false; const go=()=>{ if(!started){ started=true; idle(buildNext); } };
    if(document.readyState==="complete"||covering()) go(); else { window.addEventListener("load",go,{once:true}); setTimeout(go,1500); }
  }

  /* ---------- projection: world → screen, from where the camera is and how it is turned ---------- */
  function viewProj(c,R){
    const n=.1, f=6000, A=(f+n)/(f-n), Bv=-2*f*n/(f-n), sx=2*F/W, sy=2*F/H;
    const X=[R[0],R[1],R[2]], Y=[R[3],R[4],R[5]], Z=[R[6],R[7],R[8]];
    const dX=X[0]*c.x+X[1]*c.y+X[2]*c.z, dY=Y[0]*c.x+Y[1]*c.y+Y[2]*c.z, dZ=Z[0]*c.x+Z[1]*c.y+Z[2]*c.z;
    return new Float32Array([sx*X[0],-sy*Y[0],A*Z[0],Z[0], sx*X[1],-sy*Y[1],A*Z[1],Z[1], sx*X[2],-sy*Y[2],A*Z[2],Z[2], -sx*dX, sy*dY, -A*dZ+Bv, -dZ]);
  }

  /* ---------- shooting stars and comets ---------- */
  const meteors=[];            /* {x,y,vx,vy,t0,dur,len,b} (seconds of the page clock) */
  const comets=[];             /* several can cross at once, each on its own path */
  let nextMeteor=0, nextComet=0;
  const clock=()=>performance.now()/1000;
  const epoch=Math.floor(clock());
  function skyEvents(){
    const now=clock();
    for(let i=meteors.length-1;i>=0;i--) if(now>meteors[i].t0+meteors[i].dur) meteors.splice(i,1);
    for(let i=comets.length-1;i>=0;i--) if(now>comets[i].t0+comets[i].dur) comets.splice(i,1);
    /* only while the universe is alive: otherwise what is in the sky finishes and nothing new comes */
    if(!fancy()||!alive()){ nextMeteor=Math.max(nextMeteor,now+2); nextComet=Math.max(nextComet,now+10); return; }
    if(!nextMeteor) nextMeteor=now+2+Math.random()*3;
    if(now>=nextMeteor&&meteors.length<8){
      newMeteor(now);
      const sh=typeof Astro!=="undefined"&&Astro.shower?Astro.shower(new Date()):null;
      nextMeteor=now+(Math.random()<.18?.35+Math.random()*.6:3+Math.random()*5.5)/(1+(sh?3.5*sh.strength:0));
    }
    if(!nextComet) nextComet=now+6+Math.random()*10;
    if(now>=nextComet&&comets.length<3){
      newComet(now,0);
      nextComet=now+(Math.random()<.3?2+Math.random()*6:14+Math.random()*26);   /* now and then two or three together */
    }
  }

  /* a shooting star anywhere, heading anywhere; during a meteor shower (Astro.shower, on its real
     dates) many of them come from its radiant: they all fly outwards from that one point */
  function newMeteor(now){
    const sh=typeof Astro!=="undefined"&&Astro.shower?Astro.shower(new Date()):null;
    if(sh&&Math.random()<sh.share){
      const rx=W*sh.rx, ry=H*sh.ry, a=Math.random()*TAU, d0=30+Math.random()*Math.min(W,H)*.5;
      const dist=120+Math.random()*420, dur=.6+dist/800+Math.random()*.3, b=.6+Math.pow(Math.random(),2)*1.2;
      meteors.push({x:rx+Math.cos(a)*d0,y:ry+Math.sin(a)*d0,vx:Math.cos(a)*dist/dur,vy:Math.sin(a)*dist/dur,t0:now,dur,len:(90+Math.random()*150)*(.7+b*.35),b});
      return;
    }
    const x0=W*(.05+Math.random()*.9), y0=H*(.05+Math.random()*.8);
    let x1=W*(.1+Math.random()*.8), y1=H*(.1+Math.random()*.8);
    if(Math.hypot(x1-x0,y1-y0)<Math.min(W,H)*.3){ x1=W-x0; y1=H-y0; }
    const L=Math.hypot(x1-x0,y1-y0)||1, dist=Math.min(L,260+Math.random()*480), dur=.8+dist/700+Math.random()*.4;
    const b=.55+Math.pow(Math.random(),2)*1.1;                  /* most are faint, a few bright */
    meteors.push({x:x0,y:y0,vx:(x1-x0)/L*dist/dur,vy:(y1-y0)/L*dist/dur,t0:now,dur,len:(110+Math.random()*170)*(.7+b*.35),b});
  }
  /* kinds of comets, after real ones. coma/dust/ion: colours; k: dust tail, ion tail, curve of
     the dust tail, how wide it fans; k2: anti-tail, pieces, coma size, ion streamers; L: tail
     length (share of the screen) */
  const COMET_KINDS=[
    /* a great comet: a broad curved dust tail and a straight blue ion tail (Hale-Bopp) */
    {coma:[.78,.96,.9], dust:[1,.9,.76], ion:[.45,.62,1], k:[1.1,.75,.12,.13], k2:[0,1,1,.15], L:[.36,.5]},
    /* an ion comet: a long straight blue tail split into streamers, hardly any dust */
    {coma:[.7,.9,1], dust:[.82,.86,1], ion:[.38,.6,1], k:[.15,1.3,.03,.05], k2:[0,1,.8,.8], L:[.4,.55]},
    /* a dusty comet: a golden head and a wide, strongly curved fan of dust */
    {coma:[1,.86,.6], dust:[1,.8,.5], ion:[.5,.6,1], k:[1.5,.08,.18,.2], k2:[0,1,1.3,0], L:[.28,.4]},
    /* a small green comet (its coma glows green with carbon gas, like C/2022 E3), short faint tails */
    {coma:[.6,.95,.7], dust:[.86,.94,.84], ion:[.45,.78,.92], k:[.5,.55,.06,.08], k2:[0,1,.8,.3], L:[.16,.24]},
    /* a comet breaking up into pieces, each with its own small tails */
    {coma:[.85,.95,1], dust:[1,.92,.8], ion:[.5,.66,1], k:[.9,.45,.08,.1], k2:[0,3,.85,.2], L:[.22,.3]},
    /* a sungrazer: a very long, bright, curved white tail */
    {coma:[1,.97,.9], dust:[1,.94,.84], ion:[.5,.66,1], k:[1.4,.5,.16,.09], k2:[0,1,1.5,.1], L:[.5,.66]}];
  /* a comet crossing the screen from one side to the other, nearly level: it comes in from
     beyond one edge (tail and all) and leaves beyond the other, bright all the way. Most drift
     across in about a minute; some shoot across in ten or fifteen seconds. No two of the same
     kind on the screen at once. at: how far along it starts (0 = still off the screen) */
  function newComet(now,at){
    const used=comets.map(c=>c.kind), free=COMET_KINDS.map((_,i)=>i).filter(i=>!used.includes(i));
    const pool=free.length?free:COMET_KINDS.map((_,i)=>i), kind=pool[Math.floor(Math.random()*pool.length)], K=COMET_KINDS[kind];
    const L=Math.min(W,H)*(K.L[0]+Math.random()*(K.L[1]-K.L[0]))*(W<760?1.4:1);
    const right=Math.random()<.5, tilt=(Math.random()-.5)*.2;                 /* at most about 6 degrees */
    const th=(right?0:Math.PI)+tilt, dx=Math.cos(th), dy=Math.sin(th);
    const y=H*(.1+Math.random()*.55), ahead=L*.1+30, behind=L*1.05+30;
    /* from just beyond one edge (nothing of it on the screen yet) to just beyond the other */
    const x0=right?-ahead:W+ahead, x1=right?W+behind:-behind;
    const dist=Math.abs(x1-x0)/Math.abs(dx);
    const fast=Math.random()<.35, dur=(fast?10+Math.random()*6:40+Math.random()*30)*Math.max(.6,Math.min(1.3,dist/1600));
    /* its tails trail behind it along its path, turned a few degrees at most (and to the side its
       dust tail curves), so they always read as following the comet */
    const lean=(Math.random()<.5?-1:1)*(.03+Math.random()*.07);
    /* it lives in space, not on the glass: its path, its sun and its size are set at a depth nearer
       than the galaxies, so when the camera flies it grows, slides and passes by like the rest */
    const D=36+Math.random()*30, R=camR;
    const toW=(sx,sy)=>{ const a=[(sx-W/2)/F*D,(sy-H/2)/F*D,D];
      return [cam.x+R[0]*a[0]+R[3]*a[1]+R[6]*a[2], cam.y+R[1]*a[0]+R[4]*a[1]+R[7]*a[2], cam.z+R[2]*a[0]+R[5]*a[1]+R[8]*a[2]]; };
    const w0=toW(x0,y), w1=toW(x1,y+dy*dist), m=unit([w1[0]-w0[0],w1[1]-w0[1],w1[2]-w0[2]]);
    const side=[R[0]*-dy+R[3]*dx, R[1]*-dy+R[4]*dx, R[2]*-dy+R[5]*dx];           /* across the path, on the screen */
    const tw=unit([-m[0]+side[0]*lean,-m[1]+side[1]*lean,-m[2]+side[2]*lean]);
    comets.push({kind,t0:now-dur*at,dur,w0,w1,tw,Lw:L*D/F,seed:Math.random()*50,b:fast?.9:.8,bend:lean<0?1:-1});
  }

  /* ---------- drawing one frame ---------- */
  let frameNo=0, starsFade=1, flightFromGate=0, settled=0, dead=false;
  function render(boost){
    if(!gl||lost||!ok) return;
    frameNo++; occluders.length=0;
    if(!queue.length&&Object.keys(G).length===IDS.length+COMPANIONS.length) settled++;
    const f=float(); cam={x:base.x+f.x,y:base.y+f.y,z:base.z+f.z};
    camR=base.yaw||base.pitch?turn(base.yaw||0,base.pitch||0):[1,0,0, 0,1,0, 0,0,1];
    const o=orbit();
    if(o){
      const P=o.P, d=mul3(o.R,[cam.x-P[0],cam.y-P[1],cam.z-P[2]]);
      cam={x:P[0]+d[0],y:P[1]+d[1],z:P[2]+d[2]}; camR=mat3(o.R,camR);
    }
    const VP=viewProj(cam,camR);
    /* where the camera was a moment ago, for the streaks */
    const pc=prevCam||cam; prevCam={...cam};
    const VPp=viewProj({x:cam.x+(pc.x-cam.x)*2.2,y:cam.y+(pc.y-cam.y)*2.2,z:cam.z+(pc.z-cam.z)*2.2},camR);
    const now=clock(), t=life;
    if(flightFromGate) starsFade=Math.min(1,(performance.now()-flightFromGate)/4500);
    gl.bindFramebuffer(gl.FRAMEBUFFER,hdr.f); gl.viewport(0,0,RW,RH);
    gl.clearColor(0,0,0,1); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE,gl.ONE);
    /* the nebula, far behind */
    let u=P.neb.u; gl.useProgram(P.neb.p);
    gl.uniformMatrix4fv(u.uVP,false,VP); gl.uniform4f(u.uQuad,0,0,1800,1100); gl.uniform1f(u.uGain,.28*starsFade);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D,nebTex); gl.uniform1i(u.uTex,0);
    gl.bindVertexArray(emptyVAO); gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
    /* the band of our galaxy */
    if(band){
      if((band.W!==W||band.H!==H)&&(Math.abs(band.W/band.H-W/H)>.15)){ paintBand(); gl.bindFramebuffer(gl.FRAMEBUFFER,hdr.f); gl.viewport(0,0,RW,RH); gl.enable(gl.BLEND); gl.blendFunc(gl.ONE,gl.ONE); gl.useProgram(P.neb.p); }
      band.hx=band.hb*(W/2)/F*1400; band.hy=band.hb*(H/2)/F*1400;           /* (it follows small changes of size) */
      gl.uniform4f(u.uQuad,0,0,band.hx,band.hy); gl.uniform1f(u.uGain,1.6*starsFade);
      gl.bindTexture(gl.TEXTURE_2D,band.t); gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
    }
    /* far stars */
    u=P.far.u; gl.useProgram(P.far.p);
    gl.uniformMatrix4fv(u.uVP,false,VP); gl.uniform1f(u.uT,t); gl.uniform1f(u.uScale,scale); gl.uniform1f(u.uFade,starsFade);
    gl.bindVertexArray(far.vao); gl.drawArrays(gl.POINTS,0,far.n);
    /* tiny far galaxies */
    u=P.deep.u; gl.useProgram(P.deep.p);
    gl.uniformMatrix4fv(u.uVP,false,VP); gl.uniform2f(u.uCss,W,H); gl.uniform1f(u.uF,F); gl.uniform1f(u.uFade,starsFade);
    gl.bindVertexArray(deepBuf.vao); gl.drawArraysInstanced(gl.TRIANGLE_STRIP,0,4,deepBuf.n);
    /* the band's dust hides the far stars and galaxies behind it */
    if(band){
      u=P.dust.u; gl.useProgram(P.dust.p); gl.blendFunc(gl.ZERO,gl.ONE_MINUS_SRC_ALPHA);
      gl.uniformMatrix4fv(u.uVP,false,VP); gl.uniform4f(u.uQuad,0,0,band.hx,band.hy); gl.uniform1f(u.uGain,.92*starsFade);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D,band.t); gl.uniform1i(u.uTex,0);
      gl.bindVertexArray(emptyVAO); gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
      gl.blendFunc(gl.ONE,gl.ONE);
    }
    /* stars in the space we fly through */
    u=P.field.u; gl.useProgram(P.field.p);
    gl.uniformMatrix4fv(u.uVP,false,VP); gl.uniformMatrix4fv(u.uVPp,false,VPp);
    gl.uniform2f(u.uCss,W,H); gl.uniform1f(u.uScale,scale); gl.uniform1f(u.uBoost,boost||0); gl.uniform1f(u.uFade,starsFade);
    gl.bindVertexArray(field.vao); gl.drawArraysInstanced(gl.TRIANGLE_STRIP,0,4,field.n);
    extras("far",t,now);
    /* the galaxies, far to near */
    const list=Object.keys(G).map(id=>world[id]&&{id,w:world[id],e:G[id]}).filter(Boolean)
      .sort((a,b)=>(b.w.cz-cam.z)-(a.w.cz-cam.z));
    for(const it of list) drawGalaxy(it.w,it.e,VP,t);
    drawHoleFar();
    /* shooting stars and comets */
    drawSkyEvents(now);
    extras("near",t,now);
    gl.bindVertexArray(null);
    /* the glow */
    gl.disable(gl.BLEND);
    if(TIER.bloom){
      gl.bindFramebuffer(gl.FRAMEBUFFER,bloomA.f); gl.viewport(0,0,bloomA.w,bloomA.h);
      u=P.bright.u; gl.useProgram(P.bright.p);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D,hdr.t); gl.uniform1i(u.uTex,0);
      gl.uniform2f(u.uTexel,1/RW,1/RH); gl.uniform1f(u.uThr,.35); full();
      u=P.blur.u; gl.useProgram(P.blur.p); gl.uniform1i(u.uTex,0);
      gl.bindFramebuffer(gl.FRAMEBUFFER,bloomB.f); gl.bindTexture(gl.TEXTURE_2D,bloomA.t); gl.uniform2f(u.uStep,1/bloomA.w,0); full();
      gl.bindFramebuffer(gl.FRAMEBUFFER,bloomA.f); gl.bindTexture(gl.TEXTURE_2D,bloomB.t); gl.uniform2f(u.uStep,0,1/bloomA.h); full();
    }
    /* developing the picture on the screen */
    gl.bindFramebuffer(gl.FRAMEBUFFER,null); gl.viewport(0,0,RW,RH);
    u=P.comp.u; gl.useProgram(P.comp.p);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D,hdr.t); gl.uniform1i(u.uHdr,0);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D,bloomA.t); gl.uniform1i(u.uBloom,1);
    gl.uniform1f(u.uExp,1.1); gl.uniform1f(u.uBloomK,TIER.bloom?.55:0); gl.uniform1f(u.uTime,now%100); gl.uniform1f(u.uOutK,1);
    gl.uniform2f(u.uRes,RW,RH);
    const bh0=blackHole(), bh=bh0&&bh0.a>0?bh0:null;
    gl.uniform4f(u.uBH,bh?bh.q[0]:0,bh?bh.q[1]:0,bh?bh.q[2]:1,bh?starsFade*bh.a:0);
    gl.uniform4f(u.uBHn,bh?bh.n[0]:0,bh?bh.n[1]:1,bh?bh.n[2]:0,t);
    gl.uniform1f(u.uFpx,F*scale);
    /* the Earth and the Moon, when nearer than the hole: it is not traced where they stand */
    const occ=bh?occluders.filter(o=>o.d<bh.d).sort((a,b)=>b.r-a.r):[];
    const occAt=P.comp.occ||(P.comp.occ=[0,1].map(i=>gl.getUniformLocation(P.comp.p,"uOcc["+i+"]")));   /* (looked up once) */
    for(let i=0;i<2;i++){ const o=occ[i]; gl.uniform4f(occAt[i],o?o.x*scale:0,o?(H-o.y)*scale:0,o?o.r*scale:0,o?1:0); }
    full();
    gl.activeTexture(gl.TEXTURE0);
  }

  /* what wonders.js can use to place and draw its wonders */
  /* pictures a wonder may use (the real Earth and Moon): loaded once, mipmapped; null until ready, or for good
     if they cannot be used (a page opened from a file: the browser forbids drawing its pictures) */
  let images={};
  function image(url){
    let e=images[url];
    if(!e){
      e=images[url]={t:null};
      const im=new Image(); im.decoding="async";
      im.onload=()=>{
        if(!gl||lost||images[url]!==e) return;
        try{
          const t=gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D,t);
          gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);
          gl.texImage2D(gl.TEXTURE_2D,0,gl.RGB,gl.RGB,gl.UNSIGNED_BYTE,im);
          gl.generateMipmap(gl.TEXTURE_2D);
          gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);
          gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
          gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.REPEAT);
          gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
          const an=gl.getExtension("EXT_texture_filter_anisotropic");
          if(an) gl.texParameterf(gl.TEXTURE_2D,an.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(4,gl.getParameter(an.MAX_TEXTURE_MAX_ANISOTROPY_EXT)));
          gl.bindTexture(gl.TEXTURE_2D,null);
          e.t=t; need();
        }catch(err){ /* (the procedural one stays) */ }
      };
      im.src=url;
    }
    return e.t;
  }
  /* a picture a wonder paints once on the graphics card (its fragment shader over the whole of it, given vUv),
     mipmapped and repeating sideways: for what is costly to work out per pixel and frame, like the Earth's
     clouds. Kept by its source; after a lost context it is painted again */
  let baked={};
  function bake(fs,w,h){
    let e=baked[fs];
    if(e) return e.t;
    e=baked[fs]={t:null};
    try{
      const pr=compile(FULL_VS,HEAD+NOISE+fs); finish(pr);
      const tg=target(w,h,"rgba8");
      gl.viewport(0,0,w,h); gl.disable(gl.BLEND); gl.useProgram(pr.p); full();
      gl.bindTexture(gl.TEXTURE_2D,tg.t); gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.REPEAT);
      gl.bindTexture(gl.TEXTURE_2D,null); gl.deleteFramebuffer(tg.f); gl.deleteProgram(pr.p);
      /* back to the picture being drawn */
      gl.bindFramebuffer(gl.FRAMEBUFFER,hdr.f); gl.viewport(0,0,RW,RH); gl.enable(gl.BLEND);
      e.t=tg.t;
    }catch(err){ console.warn("universe: bake",err.message); }
    return e.t;
  }
  const api={
    image, bake, bind(unit,t){ gl.activeTexture(gl.TEXTURE0+unit); gl.bindTexture(gl.TEXTURE_2D,t); gl.activeTexture(gl.TEXTURE0); },
    get gl(){ return gl; }, get W(){ return W; }, get H(){ return H; }, get F(){ return F; }, get scale(){ return scale; },
    get fade(){ return starsFade; }, get phone(){ return phone; }, get robot(){ return robot; }, get scene(){ return scene; },
    get cam(){ return cam; }, get camR(){ return camR; },
    alive:()=>alive(), onScreen:p=>onScreen(p), need:()=>need(),
    /* a world point in the camera's own axes (x right, y down, z ahead), and the picture's size
       (render px, css px, focal length in css px): for things traced per pixel, like a real sphere */
    toCam:p=>toCam(p,cam,camR), view:()=>[RW,RH,W,F],
    /* something solid drawn this frame (css px, depth): the black hole is not traced through it */
    occlude:(x,y,r,d)=>{ occluders.push({x,y,r,d}); },
    /* how far a wonder has faded in since it became ready (0 to 1; it asks for frames until 1) */
    appear(x){ const k=Math.min(1,Math.max(0,(performance.now()-(x.readyAt||0))/1400)); if(k<1) need(); return k*k*(3-2*k); },
    /* a place seen from home (at: fraction of the half screen, computer d / phone m), at depth z */
    world:(at,z)=>{ const a=W<760?at.m:at.d; return [a[0]*(W/2)/F*z, a[1]*(H/2)/F*z, z]; },
    /* a quad on the screen, ready for the program's own settings; draw() then draws it */
    sprite(pr,x,y,hx,hy,rot){
      gl.useProgram(pr.p); const u=pr.u;
      gl.uniform2f(u.uCss,W,H); gl.uniform2f(u.uC,x,y); gl.uniform2f(u.uHalf,hx,hy); gl.uniform1f(u.uRot,rot||0);
      gl.bindVertexArray(emptyVAO); return u;
    },
    draw:()=>gl.drawArrays(gl.TRIANGLE_STRIP,0,4),
    add:()=>gl.blendFunc(gl.ONE,gl.ONE), over:()=>gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_ALPHA)
  };
  let extraFailed=false;
  const occluders=[];
  function extras(phase,t,now){
    gl.enable(gl.BLEND);
    for(const x of EXTRAS){
      if(!x.draw||x.broken||!x.ready) continue;
      try{ x.draw(api,phase,t,now); }catch(e){ if(!extraFailed){ extraFailed=true; console.warn("universe: wonder",x.id,e); } }
    }
    gl.blendFunc(gl.ONE,gl.ONE);
  }

  /* the black hole seen from the camera, in its own radii (x right, y up, z ahead), and the
     axis of its disk in the same axes (null: not in view). R is the radius of its shadow,
     which is 2.6 times the hole's own */
  function blackHole(){
    const s=SIGHTS.bh, a=onScreen(s.p);
    if(!a) return null;
    const rpx=s.R*F/a[2], m=rpx*30;
    if(rpx<.12||a[0]<-m||a[1]<-m||a[0]>W+m||a[1]>H+m) return null;   /* (from afar a speck: drawHoleFar) */
    const R=camR, n=s.n, nc=[R[0]*n[0]+R[1]*n[1]+R[2]*n[2], R[3]*n[0]+R[4]*n[1]+R[5]*n[2], R[6]*n[0]+R[7]*n[1]+R[8]*n[2]];
    const q=toCam(s.p,cam,camR), rh=s.R/2.598;
    /* only a few pixels across (far away, from the Earth or the Moon), it fades out: it is traced
       over everything, so a speck of it would show through whatever stands in front */
    const k=Math.min(1,Math.max(0,(rpx-3)/3)), sk=k*k*(3-2*k);
    return {q:[q[0]/rh,-q[1]/rh,q[2]/rh], n:[nc[0],-nc[1],nc[2]], a:sk, d:q[2], x:a[0], y:a[1], rpx, nc};
  }

  /* the black hole from afar (HOLE_FS), while the traced one is still faint */
  function drawHoleFar(){
    const b=blackHole(); if(!b||b.a>=1) return;
    const u=api.sprite(P.hole,b.x,b.y,b.rpx*4.5,b.rpx*4.5,Math.atan2(b.nc[1],b.nc[0]));
    gl.uniform1f(u.uA,(1-b.a)*starsFade*Math.min(1,b.rpx/.6)); gl.uniform1f(u.uTilt,Math.abs(b.nc[2])); gl.uniform1f(u.uS,4.5);
    gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_ALPHA); api.draw(); gl.blendFunc(gl.ONE,gl.ONE);
  }
  function drawGalaxy(w,e,VP,t){
    const g=w.g, d=g.disk, dz=w.cz-cam.z;
    if(dz<-w.R*1.5) return;
    const fade=Math.min(1,(performance.now()-e.at)/1400);
    if(fade<=0) return;
    /* the part of the screen it covers (nothing on screen: skipped) */
    const box=screenBox(w,d);
    if(!box) return;
    /* the camera in the galaxy's own frame */
    const camL=mul3(w.Inv,[cam.x-w.cx,cam.y-w.cy,cam.z-w.cz]);
    const pat=(g.rot.pat||0)*t;
    const pu=P.part.u;
    const drawStars=side=>{
      gl.blendFunc(gl.ONE,gl.ONE);
      gl.useProgram(P.part.p);
      gl.uniformMatrix4fv(pu.uVP,false,VP); gl.uniformMatrix3fv(pu.uM,false,w.M);
      gl.uniform3f(pu.uC,w.cx,w.cy,w.cz); gl.uniform3f(pu.uCamL,camL[0],camL[1],camL[2]);
      gl.uniform1f(pu.uT,t); gl.uniform1f(pu.uPat,pat); gl.uniform1f(pu.uSide,side); gl.uniform1f(pu.uFade,fade); gl.uniform1f(pu.uR,w.R);
      if(d){ gl.uniform4f(pu.uEll,d.rc,d.ex1,d.ex2,d.twist); gl.uniform2f(pu.uPhi0,d.phi0,d.logS||0); gl.uniform4f(pu.uArmP,d.young.k,d.hii.c1,d.hii.c2,0); }
      else { gl.uniform4f(pu.uEll,.1,1,1,0); gl.uniform2f(pu.uPhi0,0,0); gl.uniform4f(pu.uArmP,1,9,10,0); }
      gl.uniform4f(pu.uRot,g.rot.vmax,g.rot.ac,-1,.035);
      gl.uniform4f(pu.uLook,F*scale,Math.min(pointMax,96),1.1*(g.gain.stars||1),0);
      gl.bindVertexArray(e.vao); gl.drawArrays(gl.POINTS,0,e.n);
    };
    /* the volume is soft (diffuse light and dust), and walking its rays is most of a frame:
       with volT it is drawn at a fraction of the resolution (TIER.vol), then spread over the
       full picture with the same blending. The stars stay sharp. */
    const k=volT?TIER.vol:1;
    const lbox=volT&&[Math.max(0,Math.floor(box[0]*k)-2),Math.max(0,Math.floor(box[1]*k)-2)];
    if(lbox){ lbox.push(Math.min(volT.w,Math.ceil((box[0]+box[2])*k)+2)-lbox[0], Math.min(volT.h,Math.ceil((box[1]+box[3])*k)+2)-lbox[1]); }
    const drawVolume=side=>{
      gl.enable(gl.SCISSOR_TEST);
      if(volT){
        gl.bindFramebuffer(gl.FRAMEBUFFER,volT.f); gl.viewport(0,0,volT.w,volT.h);
        gl.scissor(lbox[0],lbox[1],lbox[2],lbox[3]);
        gl.clearColor(0,0,0,0); gl.clear(gl.COLOR_BUFFER_BIT);
        gl.disable(gl.BLEND);
        gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D,null);   /* never the picture being drawn into */
      } else {
        gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_ALPHA);
        gl.scissor(box[0],box[1],box[2],box[3]);
      }
      const u=P.vol.u; gl.useProgram(P.vol.p);
      gl.uniform3f(u.uCamL,camL[0],camL[1],camL[2]); gl.uniformMatrix3fv(u.uRot,false,mat3(w.Rot,camR));
      gl.uniform2f(u.uCss,W,H); gl.uniform2f(u.uRes,RW*k,RH*k); gl.uniform1f(u.uScale,scale*k); gl.uniform1f(u.uF,F);
      gl.uniform1f(u.uPat,pat); gl.uniform1f(u.uSide,side); gl.uniform1f(u.uFade,fade); gl.uniform1f(u.uFrame,frameNo%64);
      gl.uniform2f(u.uSteps,TIER.steps[0],TIER.steps[1]); gl.uniform1f(u.uSeed,(g.seed||1)*.173%1*9.);
      const hl=g.halo||{I:d?.035:.04,R:d?.3:.4}; gl.uniform2f(u.uHalo,hl.I,hl.R);
      ["uN4","uN8","uN16"].forEach((k,j)=>{ gl.activeTexture(gl.TEXTURE1+j); gl.bindTexture(gl.TEXTURE_3D,noiseTex.tex[j]); gl.uniform1i(u[k],1+j); });
      gl.activeTexture(gl.TEXTURE0); gl.uniform3f(u.uNz,noiseTex.off,noiseTex.lo,noiseTex.k);
      const b=g.bulge, n=b.n, bn=2*n-.327, reach=Math.min(1.6,b.Rb*Math.pow(1+Math.log(b.I/.0008)/bn,n));
      gl.uniform4f(u.uBul,b.I*(g.gain.bulge||1),b.Rb,n,reach); gl.uniform3f(u.uBQ,b.q[0],b.q[1],b.q[2]);
      gl.uniform3fv(u.uCCore,g.col.core);
      if(d&&e.map){
        gl.uniform4f(u.uZ,d.hz,1,g.gain.dust,g.gain.disk*1.25); gl.uniform2f(u.uDust,0,d.hzd||d.hz*.45);
        gl.uniform1f(u.uTexel,2*1.35/e.mapSize); gl.uniform1f(u.uPix,1/(F*scale));
        gl.uniform3fv(u.uCOld,g.col.old); gl.uniform3fv(u.uCYoung,g.col.young); gl.uniform3fv(u.uCHii,g.col.hii);
        gl.uniform2f(u.uGains,g.gain.young*1.35,g.gain.hii);
        gl.uniform4f(u.uMax,4,10,10,5); gl.uniform1f(u.uB,1.35);
        gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D,e.map); gl.uniform1i(u.uMap,0);
      } else gl.uniform4f(u.uZ,.03,0,0,0);
      full();
      if(volT){
        gl.bindFramebuffer(gl.FRAMEBUFFER,hdr.f); gl.viewport(0,0,RW,RH);
        gl.scissor(box[0],box[1],box[2],box[3]);
        gl.enable(gl.BLEND); gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_ALPHA);
        const v=P.up.u; gl.useProgram(P.up.p);
        gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D,volT.t); gl.uniform1i(v.uTex,0);
        gl.uniform2f(v.uK,k/volT.w,k/volT.h); gl.uniform2f(v.uSize,volT.w,volT.h);
        full();
      }
      gl.disable(gl.SCISSOR_TEST);
    };
    /* a phone: the edge-on galaxy as its card, once its two pictures are in (until then, the volume) */
    const card=TIER===TIERS.phone&&g===GALAXIES.edgeon&&P.card&&P.card.u&&[image(EDGE_CARD.light),image(EDGE_CARD.dust)];
    if(card&&card[0]&&card[1]){ drawStars(-1); drawCard(w,fade,card); drawStars(1); return; }
    drawStars(-1); drawVolume(-1); drawVolume(1); drawStars(1);
  }
  /* where the card was made: its half size in the world, and the camera's axes then (to turn the card as the
     galaxy's disk turns on the screen seen from elsewhere) */
  const EDGE_CARD={light:"img/edgeon-light.jpg",dust:"img/edgeon-dust.jpg",half:17.82,
    R:[0.984836,-7.4e-05,0.173486,-0.015761,0.995826,0.089898,-0.172769,-0.091269,0.980725]};
  function drawCard(w,fade,tex){
    const q=toCam([w.cx,w.cy,w.cz],cam,camR); if(q[2]<1) return;
    const n=mul3(w.M,[0,0,1]);
    const ang=R=>{ const x=R[0]*n[0]+R[1]*n[1]+R[2]*n[2], y=R[3]*n[0]+R[4]*n[1]+R[5]*n[2]; return Math.atan2(y,x); };
    const hs=EDGE_CARD.half*F/q[2];
    const u=api.sprite(P.card,W/2+q[0]*F/q[2],H/2+q[1]*F/q[2],hs,hs,ang(camR)-ang(EDGE_CARD.R));
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D,tex[0]); gl.uniform1i(u.uLight,0);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D,tex[1]); gl.uniform1i(u.uDust,1);
    gl.activeTexture(gl.TEXTURE0);
    gl.uniform1f(u.uA,fade);
    gl.disable(gl.SCISSOR_TEST); gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_ALPHA); api.draw();
  }
  /* the rectangle of the render target a galaxy can cover (null: nothing on screen) */
  function screenBox(w,d){
    const b=w.g.bulge, bn=2*b.n-.327, reach=Math.max(Math.min(1.6,b.Rb*Math.pow(1+Math.log(b.I/.0008)/bn,b.n)),((w.g.halo&&w.g.halo.R)||(d?.34:.4))*4), ex=d?Math.max(1.35,reach):reach, ez=d?Math.max(9*d.hz,reach):reach;
    let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;
    for(let i=0;i<8;i++){
      const p=mul3(w.M,[(i&1?1:-1)*ex,(i&2?1:-1)*ex,(i&4?1:-1)*ez]);
      const q=toCam([w.cx+p[0],w.cy+p[1],w.cz+p[2]],cam,camR), dz=q[2];
      if(dz<1) return [0,0,RW,RH];                       /* around us: the whole screen */
      const sx=W/2+q[0]*F/dz, sy=H/2+q[1]*F/dz;
      x0=Math.min(x0,sx); x1=Math.max(x1,sx); y0=Math.min(y0,sy); y1=Math.max(y1,sy);
    }
    if(x1<0||y1<0||x0>W||y0>H) return null;
    const X0=Math.max(0,Math.floor(x0*scale)-2), X1=Math.min(RW,Math.ceil(x1*scale)+2);
    const Y0=Math.max(0,Math.floor((H-y1)*scale)-2), Y1=Math.min(RH,Math.ceil((H-y0)*scale)+2);
    return X1>X0&&Y1>Y0?[X0,Y0,X1-X0,Y1-Y0]:null;
  }
  function drawSkyEvents(now){
    gl.blendFunc(gl.ONE,gl.ONE);
    if(meteors.length){
      const D=meteorBuf.data; D.fill(0);
      meteors.slice(0,8).forEach((m,i)=>{ D.set([m.x,m.y,m.vx,m.vy,m.t0-epoch,m.dur,m.len,m.b],i*8); });
      gl.bindBuffer(gl.ARRAY_BUFFER,meteorBuf.b); gl.bufferSubData(gl.ARRAY_BUFFER,0,D);
      const u=P.met.u; gl.useProgram(P.met.p);
      gl.uniform1f(u.uNow,now-epoch); gl.uniform2f(u.uCss,W,H);
      gl.bindVertexArray(meteorBuf.vao); gl.drawArraysInstanced(gl.TRIANGLE_STRIP,0,4,Math.min(8,meteors.length));
    }
    if(comets.length){
      const u=P.comet.u; gl.useProgram(P.comet.p);
      gl.uniform2f(u.uCss,W,H); gl.uniform1f(u.uNow,now-epoch); gl.bindVertexArray(emptyVAO);
      for(const c of comets){
        /* full brightness all the way: they start and end off the screen, so they come in over an edge */
        const k=(now-c.t0)/c.dur, K=COMET_KINDS[c.kind];
        /* where it is in space, and its tail pointing away from its sun, seen from the camera now */
        const hw=[0,1,2].map(i=>c.w0[i]+(c.w1[i]-c.w0[i])*k);
        const near=Math.sin(Math.PI*Math.min(1,Math.max(0,k))), Lw=c.Lw*(.78+.34*near);
        const tw=c.tw;
        const a=onScreen(hw), b=onScreen([hw[0]+tw[0]*Lw,hw[1]+tw[1]*Lw,hw[2]+tw[2]*Lw]);
        if(!a||!b||a[2]<3) continue;
        let tx=b[0]-a[0], ty=b[1]-a[1]; const hl=Math.hypot(tx,ty)||1; tx/=hl; ty/=hl;
        const L=Math.min(hl,Math.min(W,H)*4);
        const close=Math.min(1,(a[2]-3)/6);                  /* fades as the camera flies right through it */
        gl.uniform2f(u.uHead,a[0],a[1]); gl.uniform2f(u.uDir,tx,ty);
        gl.uniform2f(u.uSize,L,L*.5); gl.uniform1f(u.uA,c.b*(.75+.25*near)*close*starsFade); gl.uniform1f(u.uSeed,c.seed);
        gl.uniform1f(u.uAge,now-c.t0);
        gl.uniform3fv(u.uComa,K.coma); gl.uniform3fv(u.uDustC,K.dust); gl.uniform3fv(u.uIonC,K.ion);
        gl.uniform4f(u.uK,K.k[0],K.k[1],K.k[2]*c.bend,K.k[3]); gl.uniform4fv(u.uK2,K.k2);
        gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
      }
    }
  }

  /* ---------- one loop for everything that moves ----------
     It runs only while something needs it: a flight, a galaxy appearing, life
     (every frame on a computer, about 30 a second on a phone), or one frame after a change. */
  let raf=0, lastT=0, lastDraw=0, dirty=true, looping=false, more=false;
  const gaps=[]; let lastAdapt=0;
  /* need(): one more frame. Asked while a frame is being drawn (a supernova, a wonder fading in),
     it is the loop that asks for the next one: starting another loop there made two loops run
     every frame, then four, then eight… */
  function need(){ dirty=true; if(looping) more=true; else kick(); }
  function kick(){ if(!raf&&!looping&&ok){ lastT=performance.now(); raf=requestAnimationFrame(loop); } }
  function appearing(){ const now=performance.now(); return Object.values(G).some(e=>now-e.at<1400); }
  function loop(now){
    raf=0; looping=true; more=false;
    let again=false;
    try{ again=oneFrame(now); }finally{ looping=false; }
    if(!raf&&(again||more)) raf=requestAnimationFrame(loop);
  }
  /* one turn of the loop; true: the next frame is needed too */
  function oneFrame(now){
    if(lost||!ok) return false;
    const dt=Math.min(.1,Math.max(0,(now-lastT)/1000)); lastT=now;
    /* behind the PIN screen nothing is visible: nothing is drawn (the flight starts it) */
    if(root.hasAttribute("data-locked")&&!anim){ dirty=false; return false; }
    /* behind the passage: only the one frame that shows everything is built (ready() waits
       for it); drawing more would only take the graphics card from the passage's stars */
    if(hidden()){ if(dirty&&!queue.length&&!settled){ dirty=false; render(0); } return false; }
    const live=alive();
    if(live) life+=dt;
    steer(dt);
    /* a flight's last step ends it: that frame is drawn all the same, or the screen could stay
       on where it came from (a flight whose frames were held back, in a hidden tab, ends at once) */
    let boost=0; const flying=!!anim;
    if(anim) boost=anim.step(now);
    skyEvents();
    const busy=flying||appearing()||meteors.length>0||comets.length>0;
    if(!busy&&!live&&!dirty) return false;
    /* life alone: about 60 a second on a computer (every frame of a 60 Hz screen, every other
       one of a 120 or 144 Hz screen: the drift is far too slow to need more), about 30 on a
       phone (10 under automated tests). While the page scrolls the sky keeps moving, a little
       less often (about 30 and 22 a second), so the scrolling gets most of each frame */
    const scrolling=now-scrolledAt<250;
    const every=robot?(anim?60:100):anim?0:scrolling?(phone?45:31):phone?31:13;
    /* every frame for flights and galaxies fading in; shooting stars and comets are smooth at the pace of life */
    if(flying||appearing()||dirty||now-lastDraw>=every){
      dirty=false;
      adapt(now);                /* before drawing: a new size wipes the canvas, so this frame must be drawn after it */
      render(boost);
      lastDraw=now;
    }
    return busy||live;
  }
  /* if this device cannot keep up, draw fewer pixels (and more again if there is room) */
  function adapt(now){
    if(!alive()&&!anim){ gaps.length=0; return; }
    /* while the page scrolls the sky is drawn less often on purpose: that is no sign of a slow device */
    if(!anim&&now-scrolledAt<250){ gaps.length=0; gaps.last=0; return; }
    if(gaps.last) gaps.push(now-gaps.last);
    gaps.last=now;
    if(gaps.length<24||now-lastAdapt<1500) return;
    const s=gaps.slice(-24).sort((a,b)=>a-b), med=s[12];
    let ns=scale;
    if(med>(phone?40:24)&&scale>.5) ns=Math.max(.5,scale*Math.max(.7,Math.sqrt((phone?34:18)/med)));   /* far behind: a bigger step */
    else if(med<(phone?34:18)&&scale<maxScale) ns=Math.min(maxScale,scale*1.08);
    if(Math.abs(ns-scale)>.01){ scale=ns; sizeTargets(); }
    lastAdapt=now; gaps.length=0;
  }
  document.addEventListener("visibilitychange",kick);
  new MutationObserver(kick).observe(document.body,{attributes:true,attributeFilter:["class"]});
  new MutationObserver(need).observe(root,{attributes:true,attributeFilter:["class"]});

  /* ---------- moving the camera ---------- */
  /* soft at both ends, and no rush in the middle (its top speed is under twice the average; the cubic's was three times) */
  const easeInOut=p=>p*p*p*(p*(p*6-15)+10);
  const easeOut=p=>1-Math.pow(1-p,3);
  /* how long a flight takes: a little longer the farther it goes (to the Earth, far behind home, about five and a half seconds) */
  const flightTime=(a,b)=>Math.round(Math.min(6500,2200+6.5*Math.hypot(b.x-a.x,b.y-a.y,b.z-a.z)));
  /* onArrive: when the flight is (nearly) there · onCancel: if another flight replaces it first */
  /* ---------- a flight's way: straight, unless something solid (the Earth, the Moon) stands on it ----------
     Then it bows out: one smooth curve from start to end (a cubic Bézier whose two middle points are pushed
     sideways), bent just enough to pass each world at 2.6 times its radius (or as far as where the flight
     starts or ends, if that is nearer). One curve, no corners: the camera never turns, it only leans */
  const V3={sub:(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]], add:(a,b)=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]], mul:(a,k)=>[a[0]*k,a[1]*k,a[2]*k],
    dot:(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2], len:a=>Math.hypot(a[0],a[1],a[2])};
  function wayOf(a,b){
    const A=[a.x,a.y,a.z], B=[b.x,b.y,b.z], ab=V3.sub(B,A), L2=V3.dot(ab,ab);
    const hits=[];
    if(L2>1e-6) EXTRAS.forEach(x=>(x.solids||[]).forEach(o=>{
      const t=Math.max(0,Math.min(1,V3.dot(V3.sub(o.p,A),ab)/L2));
      if(t<=.02||t>=.98) return;
      let off=V3.sub(V3.add(A,V3.mul(ab,t)),o.p);
      const need=1.08*Math.min(o.R*2.6,V3.len(V3.sub(A,o.p))*.98,V3.len(V3.sub(B,o.p))*.98);
      if(V3.len(off)>=need) return;
      if(V3.len(off)<1e-3){ off=[ab[2]*1e-3,0,-ab[0]*1e-3]; if(V3.len(off)<1e-9) off=[1e-3,0,0]; }   /* dead ahead: round its side */
      hits.push({t,off,need});
    }));
    if(!hits.length) return null;
    /* which way to lean: away from them all, the tighter ones counting more */
    let dir=[0,0,0]; hits.forEach(h=>{ dir=V3.add(dir,V3.mul(h.off,(h.need-V3.len(h.off))/V3.len(h.off))); });
    if(V3.len(dir)<1e-6) dir=hits[0].off;
    dir=V3.mul(dir,1/V3.len(dir));
    /* how far: at each one's place t the curve sits 3t(1-t)·k to the side; enough for the tightest */
    let k=0;
    hits.forEach(h=>{
      const od=V3.dot(h.off,dir), s=-od+Math.sqrt(Math.max(0,od*od-V3.dot(h.off,h.off)+h.need*h.need));
      const tt=Math.max(.15,Math.min(.85,h.t));
      k=Math.max(k,s/(3*tt*(1-tt)));
    });
    const C1=V3.add(V3.add(A,V3.mul(ab,1/3)),V3.mul(dir,k)), C2=V3.add(V3.add(A,V3.mul(ab,2/3)),V3.mul(dir,k));
    const at=u=>{ const v=1-u, w0=v*v*v, w1=3*v*v*u, w2=3*v*u*u, w3=u*u*u;
      return [0,1,2].map(i=>w0*A[i]+w1*C1[i]+w2*C2[i]+w3*B[i]); };
    /* spaced by length, so the speed along it is the easing's alone */
    const N=64, len=[0]; let prev=A;
    for(let i=1;i<=N;i++){ const q=at(i/N); len.push(len[i-1]+V3.len(V3.sub(q,prev))); prev=q; }
    return {at,len,N,tot:len[N]};
  }
  /* where on that curve, a share e of the way along it */
  function alongWay(w,e){
    const s=Math.max(0,Math.min(1,e))*w.tot, L=w.len;
    let i=1; while(i<w.N&&L[i]<s) i++;
    const f=(s-L[i-1])/Math.max(1e-9,L[i]-L[i-1]);
    return w.at((i-1+Math.max(0,Math.min(1,f)))/w.N);
  }

  function go(to,{animate=true,duration,onArrive,onCancel,arriveAt=.85}={}){
    /* already flying there: wait for that same flight to arrive */
    if(anim&&to===scene){ if(onArrive) anim.also.push(onArrive); if(onCancel) anim.cancels.push(onCancel); return; }
    const replaced=anim; anim=null;
    const from=scene, sameScene=to===scene;
    scene=to;
    if(replaced) replaced.cancels.forEach(fn=>fn());
    if(!ok){
      /* no 3D universe: with Quality = Medium the sky of stars flies instead (Stars, in sky.js) */
      if(window.Stars&&Stars.go(to,{animate,from,onArrive,onCancel})) return;
      if(onArrive) onArrive(); return;                 /* nothing drawn (Quality = Low, no WebGL2) */
    }
    const start={...base};
    if(!animate||!fancy()||sameScene){ base={...camFor(to)}; prevCam=null; if(from==="gate") starsFade=1; need(); if(onArrive) onArrive(); return; }
    if(from==="gate"){ flightFromGate=performance.now(); starsFade=0; }
    const way=wayOf(start,camFor(to));
    if(!duration) duration=flightTime(start,camFor(to))*(way?Math.min(1.35,way.tot/Math.max(1e-6,Math.hypot(camFor(to).x-start.x,camFor(to).y-start.y,camFor(to).z-start.z))):1);
    const t0=performance.now(); let reached=false;
    /* taking over a moving camera: it starts already moving, so it does not stop and start again */
    const ease=replaced?easeOut:easeInOut;
    const me={also:onArrive?[onArrive]:[],cancels:onCancel?[onCancel]:[],step(now){
      const p=Math.min(1,(now-t0)/duration), e=ease(p), target=camFor(to);   /* the target follows a resize */
      const wp=way&&e<1?alongWay(way,e):null;
      base={x:wp?wp[0]:start.x+(target.x-start.x)*e, y:wp?wp[1]:start.y+(target.y-start.y)*e, z:wp?wp[2]:start.z+(target.z-start.z)*e,
        yaw:(start.yaw||0)+((target.yaw||0)-(start.yaw||0))*e, pitch:(start.pitch||0)+((target.pitch||0)-(start.pitch||0))*e};
      if(p>=arriveAt&&!reached){ reached=true; me.also.forEach(fn=>fn()); }
      if(p>=1&&anim===me) anim=null;
      /* while flying, the scattered stars shine more: that is where the sense of speed comes from */
      return Math.sin(Math.PI*p)*.9;
    },
    /* a second click during the trip: what waits for the arrival shows now, while the camera
       flies on to the end (the sky never jumps) */
    early(){
      if(anim!==me||reached) return false;
      reached=true; me.also.forEach(fn=>fn());
      return true;
    }};
    anim=me; kick();
  }

  /* ---------- start ---------- */
  function start(){
    layout();
    scale=Math.min(devicePixelRatio||1,1.5)*TIER.scale; maxScale=Math.min(devicePixelRatio||1,TIER.maxScale);
    sizeTargets();
    buildSky();
    if(!scene) scene=startScene();                      /* (a scene may already have been asked for) */
    base={...camFor(scene)};
    starsFade=scene==="gate"?0:1;
    ok=true;
    startBuilding();
    need();
    /* the first opening of the app at home (once per visit): it leaves the Earth and flies out to home */
    let first=false; try{ first=!sessionStorage.getItem("nolan-launched")||!!sessionStorage.getItem("nolan-fly"); sessionStorage.setItem("nolan-launched","1"); sessionStorage.removeItem("nolan-fly"); }catch(e){}
    /* (and when a guest has just come in: gate.js reloads the page with the demo, "nolan-fly") */
    if(first&&scene==="home"&&!robot&&fullMotion()&&!root.hasAttribute("data-locked")&&!covering()){
      scene="gate"; base={...camFor("gate")};
      /* (html.launching: while it flies, the "skip" button is offered, home.js) */
      const landed=()=>root.classList.remove("launching");
      root.classList.add("launching"); go("home",{duration:4200,onArrive:landed,onCancel:landed});
    }
  }
  /* no 3D after all: the plain background shows instead */
  function giveUp(e){
    console.warn("universe: no 3D",e);
    ok=false; dead=true; root.classList.remove("gl"); root.classList.add("nogl"); cv.style.display="none";
  }
  if(cv&&HQ){
    try{
      if(initGL()){
        root.classList.add("gl");                      /* at once, so sky.js does not draw its own sky */
        const boot=()=>{ try{ compileAll(); whenCompiled(()=>{ try{ start(); }catch(e){ giveUp(e); } },giveUp); }catch(e){ giveUp(e); } };
        /* behind the passage: first let the page paint its stars, then the heavy work */
        if(covering()) requestAnimationFrame(()=>setTimeout(boot,0)); else boot();
        /* the pictures saved by older versions are not needed any more */
        try{ indexedDB.deleteDatabase("nolan-cosmos"); }catch(e){}
      }
    }catch(e){ giveUp(e); }
    if(gl){
      cv.addEventListener("webglcontextlost",e=>{ e.preventDefault(); lost=true; ok=false; });
      cv.addEventListener("webglcontextrestored",()=>{
        lost=false; P={}; hdr=bloomA=bloomB=volT=null; RW=RH=1; images={}; baked={};
        Object.keys(G).forEach(k=>delete G[k]);
        try{ if(initGL()){ compileAll(); whenCompiled(()=>{ hdr=null; sizeTargets(); buildSky(); ok=true; startBuilding(); need(); },giveUp); } }catch(e){ giveUp(e); }
      });
    }
    /* only a real change of size */
    let rz=0; window.addEventListener("resize",()=>{ clearTimeout(rz); rz=setTimeout(()=>{
      if(!ok) return;
      if(Math.abs(cv.clientWidth-W)>2||Math.abs(cv.clientHeight-H)>2){
        layout(); if(!anim) base={...camFor(scene)}; sizeTargets();
        /* the new size wiped the canvas: draw now, or the screen shows it black until the next frame */
        if(!lost) render(0);
        need();
      }
    },200); });
  }
  if(!gl) root.classList.add("nogl");
  if(!scene) scene=startScene();
  /* seek(seconds): jump life forward (tests and debugging) */
  /* skip(): what waits for the flight under way shows now; the flight itself goes on (true if it did something) */
  const skip=()=>ok?!!anim&&anim.early():!!(window.Stars&&Stars.skip());
  /* land(): the flight under way ends now, the camera already where it was going (the "skip" button) */
  function land(){
    if(!ok) return skip();
    if(!anim) return false;
    const a=anim; a.early(); if(anim===a) anim=null;
    base={...camFor(scene)}; prevCam=null; starsFade=1; need();
    return true;
  }
  /* ready(): everything is built and on the screen (or there is no universe to wait for) */
  const ready=()=>!gl||lost||dead||root.hasAttribute("data-locked")||settled>=1;
  return {go, skip, land, ready, seek:v=>{ life=v; need(); }, scene:()=>scene, busy:()=>ok?!!anim:!!(window.Stars&&Stars.busy()), camera:()=>({...base}),
    painted:()=>IDS.filter(id=>G[id]).length, gl:()=>ok, built:()=>Object.keys(G),
    /* hole(): whether the black hole is on the screen now (tests) */
    hole:()=>{ if(!ok) return false; const b=blackHole(); return !!b&&b.a>0; },   /* (traced; from afar it is drawn among the galaxies instead) */
    /* sights(): the names of the places that can be flown to and looked at (home.js lists them) */
    sights:sightIds,
    /* place(id): where a sight is on the screen now and how big it looks, in css px (tests) */
    place:id=>{ const pl=PLACES[id]; if(!ok||!pl||!pl.p) return null; const q=onScreen(pl.p); return q&&{x:q[0],y:q[1],r:pl.R*F/q[2],W,H}; },
    /* shoot(): a shooting star and a comet right now (tests) */
    shoot:at=>{ newMeteor(clock()); newComet(clock(),at||0); need(); },
    /* band(): whether the band of our galaxy has been painted (tests) */
    band:()=>!!band,
    /* view(id): how a galaxy sits on the screen now (tests): the box of its disk's rim in css px,
       where its centre is, and how far (degrees) the camera stands out of its disk plane */
    view:id=>{
      const w=world[id]; if(!ok||!w) return null;
      const d=w.g.disk, rim=d?1.35:1, xs=[], ys=[];
      for(let i=0;i<48;i++){ const a=i/48*TAU, q=onScreen([w.cx+w.M[0]*Math.cos(a)*rim+w.M[3]*Math.sin(a)*rim, w.cy+w.M[1]*Math.cos(a)*rim+w.M[4]*Math.sin(a)*rim, w.cz+w.M[2]*Math.cos(a)*rim+w.M[5]*Math.sin(a)*rim]);
        if(!q) return null; xs.push(q[0]); ys.push(q[1]); }
      const c=onScreen([w.cx,w.cy,w.cz]), l=mul3(w.Inv,[cam.x-w.cx,cam.y-w.cy,cam.z-w.cz]);
      return {x0:Math.min(...xs),x1:Math.max(...xs),y0:Math.min(...ys),y1:Math.max(...ys),cx:c&&c[0],cy:c&&c[1],W,H,
        rise:Math.asin(l[2]/Math.hypot(...l))*180/Math.PI};
    }, GALAXIES, SIGHTS};
})();
