/* ==========================================================
   wonders.js — the other wonders of the universe, beyond the galaxies
   and the black hole. Each one is drawn by the graphics card from a
   formula (no pictures), in its place in space, so the camera's flights
   and slow turns move it like everything else, and bright parts glow.
   · The Orion Nebula: a glowing cloud of hydrogen (pink-red), lit from
     inside by four hot young stars (the Trapezium), with dark lanes of dust.
   · The Pleiades: a young cluster of hot blue stars wrapped in the blue
     haze of dust they light up (a reflection nebula).
   · The Ring Nebula: a dying star's shell of gas, blue-green inside and
     red at the rim, with the tiny white dwarf left in the middle.
   · A star eating its companion: a swollen red giant, pulled into a drop,
     pours a stream of gas onto a white dwarf through its bright disk; the
     two go round each other.
   · The Antennae: two galaxies colliding, their cores merging, pink
     knots of new stars where they crash, and two long tails flung out.
   · Now and then, a supernova: a star in a far galaxy flares in a second,
     blue-white; its blast wave rushes out, fills the sky and sweeps over
     the camera in a white flare; the star fades, turns yellow and red, and
     leaves a small ragged shell of glowing gas.
   · The Earth and the Moon: where every opening of the app starts (the
     camera leaves them behind on its way home): the Earth turning, its
     night side dotted with city lights, auroras over its poles, its thin
     blue air; the Moon beside it in its real phase for today.
   Each of them (the supernova aside) is also a sight: a place you can fly
   to and look at whole from home's list (sights: its name, where it is and
   how big it looks; universe.js frames it).
   Registered in window.UNIVERSE_EXTRAS before universe.js runs, which
   compiles their programs and calls draw() every frame (see "api" there);
   each fades in once its program is ready.
   ========================================================== */
window.UNIVERSE_EXTRAS=window.UNIVERSE_EXTRAS||[];
const Wonders=(function(){
  const TAU=Math.PI*2;
  /* the real Earth and Moon (img/): carrying this version in their address, like every file */
  const VER=((document.currentScript&&document.currentScript.src.match(/[?&]v=([^&#]+)/))||[])[1]||"";
  const IMG=n=>"img/"+n+(VER?"?v="+VER:"");
  /* 3D value noise, for the spheres (the Earth, the Moon) */
  const N3=`
float h31(vec3 p){ p=fract(p*.1031); p+=dot(p,p.zyx+31.32); return fract((p.x+p.y)*p.z); }
float vn3(vec3 p){ vec3 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
  return mix(mix(mix(h31(i),h31(i+vec3(1,0,0)),f.x),mix(h31(i+vec3(0,1,0)),h31(i+vec3(1,1,0)),f.x),f.y),
             mix(mix(h31(i+vec3(0,0,1)),h31(i+vec3(1,0,1)),f.x),mix(h31(i+vec3(0,1,1)),h31(i+vec3(1,1,1)),f.x),f.y),f.z); }
float fbm3(vec3 p,int oct){ float t=0.,a=.5,n=0.; for(int o=0;o<6;o++){ if(o>=oct) break; t+=a*vn3(p); n+=a; a*=.5; p=p*2.03+vec3(17.3,-9.1,4.7);} return t/n; }
`;
  /* uPar: how the camera looks at it, off its own front (in its square's axes): layers at different
     depths slide against each other by it, so a wonder has depth when the camera moves or turns */
  const COMMON=`in vec2 vQ; out vec4 o; uniform float uT, uA, uS; uniform vec2 uPar;
float edgeFade(){ return 1.-smoothstep(.82,1.,max(abs(vQ.x),abs(vQ.y))); }
`;
  /* where a wonder is on the screen now (null: not in view) */
  function spot(api,p,R){
    const a=api.onScreen(p); if(!a) return null;
    const r=R*api.F/a[2], m=r*1.6;
    if(r<1.5||a[0]<-m||a[1]<-m||a[0]>api.W+m||a[1]>api.H+m) return null;
    return {x:a[0],y:a[1],r,d:a[2]};
  }
  const set=(u,k,...v)=>{ if(u[k]!==undefined&&u[k]!==null) api0.gl["uniform"+v.length+"f"](u[k],...v); };
  let api0=null;
  const big=api=>api.W<760?1.5:1;                     /* a little bigger on a phone, so they still read */
  /* the wonder's own front faces +z (away from home, like the view of its sight): how far the line of
     sight to it leans off that front, in the camera's screen axes, then in its (turned) square's axes */
  function parallax(api,p,rot){
    const c=api.cam, R=api.camR, d=[p[0]-c.x,p[1]-c.y,p[2]-c.z], l=Math.hypot(...d)||1, w=d.map(x=>x/l);
    const v=[-w[2]*w[0],-w[2]*w[1],1-w[2]*w[2]];
    const x=v[0]*R[0]+v[1]*R[1]+v[2]*R[2], y=v[0]*R[3]+v[1]*R[4]+v[2]*R[5], cr=Math.cos(rot), sr=Math.sin(rot);
    return [cr*x+sr*y,-sr*x+cr*y];
  }

  /* a wonder that sits in the sky seen from home. sight: its name as a place you can fly to
     and look at (universe.js, PLACES), and vis: how much of its square it really fills (so the
     camera frames what shows, not the empty corners) */
  function skyWonder(id,{at,z,R,rot=0,phase="far",blend="add",sight,vis=.8,shader,uniforms}){
    const w={id,shaders:{main:shader},sights:sight?[{id:sight,R:R*vis,p:null}]:[],
      layout(api){ w.p=api.world(at,z); w.sights.forEach(s=>{ s.p=w.p; s.R=R*big(api)*vis; }); },
      draw(api,ph,t,now){
        if(ph!==phase||!w.p) return;
        api0=api;
        const s=spot(api,w.p,R*big(api)); if(!s) return;
        const u=api.sprite(w.prog.main,s.x,s.y,s.r,s.r,rot);
        set(u,"uT",t); set(u,"uA",api.fade*api.appear(w)); set(u,"uS",(id.length*7.31)%10);
        const pv=parallax(api,w.p,rot); set(u,"uPar",pv[0],pv[1]);
        if(uniforms) uniforms(api,u,t,now,s);
        blend==="add"?api.add():api.over();
        api.draw();
      }};
    window.UNIVERSE_EXTRAS.push(w);
    return w;
  }

  /* ---------- the Orion Nebula ---------- */
  skyWonder("orion",{at:{d:[.8,.1],m:[-.12,.3]},z:140,R:13.5,rot:.35,blend:"over",sight:"orion",vis:.62,shader:COMMON+`
/* gas that flows: the warp itself drifts and turns, so the clouds churn and stream, not just slide */
float warp(vec2 p,float k){ float t=uT*k;
  vec2 q=vec2(fbm(p+uS+vec2(t*.6,t*.25),4),fbm(p+vec2(5.2,1.3)+uS-vec2(t*.3,t*.5),4));
  return fbm(p+2.3*q+vec2(t,-t*.4),4); }
mat2 turn(float a){ float c=cos(a), s=sin(a); return mat2(c,-s,s,c); }
void main(){
  /* three depths: the glowing gas far behind, a second sheet of gas nearer, and the dust veil in front.
     As the camera goes round they slide against each other by their depth: the nebula has thickness */
  vec2 p0=vQ*1.15;
  vec2 pb=turn(uT*.004)*(p0+uPar*.55), pm=turn(-uT*.003)*(p0+uPar*.22), pf=p0-uPar*.5;
  float r=length(pb), env=exp(-r*r*2.3), envm=exp(-dot(pm,pm)*2.6);
  float n=warp(pb*1.7,.03), n2=warp(pm*2.4+7.,.045);
  float gas=pow(clamp(n*1.4-.28,0.,1.),1.5)*env;
  float sheet=pow(clamp(n2*1.5-.45,0.,1.),1.6)*envm;
  /* the bright heart around the Trapezium (it breathes a little: the stars' wind), and the "wings" */
  vec2 c=pm-vec2(.08,-.04); float core=exp(-dot(c,c)*22.)*(1.+.12*sin(uT*.6));
  float wings=exp(-pow(pb.y+.9*pb.x*pb.x,2.)*7.)*exp(-abs(pb.x)*1.1);
  vec3 col=vec3(.98,.24,.42)*gas*(.55+1.1*wings)*1.25
          +vec3(1.,.55,.32)*gas*.4*smoothstep(.25,.9,r)
          +vec3(1.,.42,.5)*sheet*.7
          +vec3(.45,.66,1.)*core*(.35+.6*n2)*(gas+sheet)*2.+vec3(1.,.86,.9)*pow(core,4.)*.55;
  /* the dust veil in front, its filaments drifting */
  float fil=1.-abs(fbm(pf*3.4+vec2(9.+uT*.03,uS-uT*.012),5)*2.-1.);
  float dust=smoothstep(.55,.9,fil)*smoothstep(.35,.7,fbm(pf*2.+3.+uT*.01,4))*exp(-dot(pf,pf)*2.3);
  /* the Trapezium, in the heart of the gas, and young stars scattered at three depths, twinkling */
  vec2 tp[4]=vec2[4](vec2(.05,-.07),vec2(.11,-.03),vec2(.08,-.11),vec2(.13,-.09));
  vec2 pt=p0+uPar*.2;
  float st=0.; for(int i=0;i<4;i++){ vec2 d=pt-tp[i]; st+=(exp(-dot(d,d)*9000.)*2.6+exp(-dot(d,d)*700.)*.3)*(.85+.15*sin(uT*1.7+float(i)*2.3)); }
  float sp=0.;
  for(int k=0;k<3;k++){ float dep=k==0?.6:k==1?.1:-.35;
    vec2 q=(p0+uPar*dep)*(k==0?26.:k==1?18.:13.)+float(k)*.37; vec2 g=floor(q); float hs=h12(g+uS+float(k)*5.1);
    vec2 f=fract(q)-.5-(vec2(h12(g+3.1),h12(g+7.7))-.5)*.7; sp+=step(.9,hs)*exp(-dot(f,f)*70.)*(.35+hs)*(.6+.4*sin(uT*(1.+hs*3.)+hs*40.)); }
  vec3 C=col*(1.-dust*.85)+vec3(.85,.9,1.)*(st+sp*env*1.3);
  float e=edgeFade();
  o=vec4(C*uA*e,clamp(dust*.75,0.,.8)*uA*e);
}`});

  /* ---------- the Pleiades ---------- */
  skyWonder("pleiades",{at:{d:[-.85,-.03],m:[.72,.05]},z:120,R:8,rot:-.2,sight:"pleiades",vis:.68,shader:COMMON+`
/* the nine brightest (positions and brightness after the real cluster), each at its own depth */
const vec3 S[9]=vec3[9](vec3(0.,0.,1.),vec3(-.48,.05,.62),vec3(-.5,-.08,.2),vec3(.36,-.1,.58),vec3(.17,.2,.42),
                        vec3(.23,-.26,.5),vec3(.35,-.44,.38),vec3(.49,-.28,.16),vec3(.33,-.56,.14));
const float Z[9]=float[9](.05,-.32,.28,.18,-.22,.36,-.12,.3,-.28);
/* a cluster is a ball of stars, not a picture: it turns slowly (and as the camera goes round), so its
   stars pass in front of and behind each other, the near ones moving across the far ones */
vec2 place(vec3 x,float yaw,float pitch){
  float cy=cos(yaw), sy=sin(yaw), cp=cos(pitch), sp=sin(pitch);
  vec3 r=vec3(cy*x.x+sy*x.z,x.y,-sy*x.x+cy*x.z); r=vec3(r.x,cp*r.y-sp*r.z,sp*r.y+cp*r.z);
  return r.xy/(1.-r.z*.18);                                /* a little perspective: the near side larger */
}
void main(){
  vec2 p0=vQ*1.1; vec3 C=vec3(0.);
  float yaw=uT*.035+uPar.x*1.6, pitch=.15*sin(uT*.021)+uPar.y*1.2;
  vec2 P[9]; for(int i=0;i<9;i++) P[i]=place(vec3(S[i].xy*.78,Z[i]),yaw,pitch);
  /* the blue haze: dust the cluster drifts through, lit by its stars; two sheets at different depths,
     streaming slowly past each other */
  vec2 p=p0+uPar*.3, ph=p0-uPar*.25;
  float ca=cos(-.6), sa=sin(-.6); vec2 q=vec2(ca*p.x-sa*p.y,sa*p.x+ca*p.y)+vec2(uT*.02,0.);
  vec2 q2=vec2(ca*ph.x-sa*ph.y,sa*ph.x+ca*ph.y)-vec2(uT*.014,uT*.004);
  float streak=fbm(q*vec2(2.,5.)+uS,5), broad=fbm(p*2.6+uS+4.+vec2(0.,uT*.012),4);
  float fine=pow(1.-abs(fbm(q*vec2(3.,12.)+uS*1.7,4)*2.-1.),2.), near=pow(1.-abs(fbm(q2*vec2(2.5,9.)+uS*2.3,4)*2.-1.),3.);
  float lit=0.;
  for(int i=0;i<9;i++){ vec2 d=p-P[i]; float k=i==3?1.8:1.; lit+=S[i].z*k*(exp(-dot(d,d)*9.)*.8+exp(-length(d)*9.)*.35); }
  float dust=smoothstep(.3,.75,broad*.6+streak*.6);
  C+=vec3(.3,.5,1.)*lit*(dust*(.6+.5*fine)+near*.25)*.5;
  C+=vec3(.5,.66,1.)*lit*lit*.05;
  /* the stars: hot and blue-white, the brightest with the telescope's spikes */
  for(int i=0;i<9;i++){
    vec2 d=p0-P[i]; float b=S[i].z*(.88+.12*sin(uT*2.3+float(i)*2.1)), r2=dot(d,d), r=sqrt(r2);
    float spk=(exp(-abs(d.x)*420.)+exp(-abs(d.y)*420.))*exp(-r*(9.-5.*b))*b*b;
    C+=vec3(.78,.87,1.)*b*(exp(-r2*9000.)*5.+exp(-r2*900.)*.9+exp(-r*22.)*.22)+vec3(.7,.82,1.)*spk*.9;
  }
  /* the fainter members, turning with the rest: sixty of them, each somewhere in the ball */
  for(int i=0;i<60;i++){
    float fi=float(i);
    vec3 x=(vec3(h12(vec2(fi,uS+1.)),h12(vec2(fi,uS+2.)),h12(vec2(fi,uS+3.)))-.5)*vec3(1.9,1.6,1.2);
    vec2 d=p0-place(x,yaw,pitch); float hs=h12(vec2(fi,uS+4.));
    C+=vec3(.82,.88,1.)*exp(-dot(d,d)*(5000.+6000.*hs))*(.3+.7*hs)*(.75+.25*sin(uT*(1.3+hs*2.)+fi));
  }
  o=vec4(C*uA*edgeFade(),0.);
}`});

  /* ---------- the Ring Nebula ---------- */
  skyWonder("ringneb",{at:{d:[-.72,.27],m:[-.38,.5]},z:120,R:4.6,rot:.5,blend:"over",sight:"ring",vis:.62,shader:COMMON+N3+`
/* A real shell of gas, walked through along the line of sight: a barrel, densest round its waist, seen
   nearly down its axis. The waist is the bright ring; the two ends are the fainter glow inside it. The axis
   leans with where the camera looks from (uPar), so as the view turns it shows as the solid it is.
   Hotter gas near the star shines blue-green (oxygen), the cooler rim red (nitrogen, hydrogen), and
   small dark knots of dust stud the inner edge of the ring. */
void main(){
  vec2 p=vQ*1.25;
  vec3 ax=normalize(vec3(uPar*1.1+vec2(.1,-.07)+.14*vec2(cos(uT*.045),sin(uT*.045)),1.)), u1=normalize(cross(vec3(0.,1.,0.),ax)), u2=cross(ax,u1);
  float rp=length(p/vec2(1.,.82)), ang=atan(p.y,p.x)+uT*.02;
  float fil=fbm(vec2(ang*2.6,rp*9.-uT*.06)+uS,4);                 /* filaments, streaming outwards */
  vec3 C=vec3(0.); float cov=0.;                                  /* cov: how much gas the ray went through */
  const int N=12;                                                 /* (light enough for a phone filling its screen with it) */
  for(int i=0;i<N;i++){
    float z=mix(-1.,1.,(float(i)+.5)/float(N));
    vec3 x=vec3(p,z);
    float h=dot(x,ax); vec2 q=vec2(dot(x,u1),dot(x,u2)*1.2);
    float R3=length(vec3(q,h*.7));
    float shell=exp(-pow((R3-.6)/.12,2.)), waist=exp(-h*h*3.);
    float n=vn3(x*5.+uS+vec3(uT*.02,-uT*.015,uT*.03));        /* the gas churns */
    float kw=exp(-pow((R3-.53)/.06,2.)), knot=kw>.02?smoothstep(.72,.9,vn3(x*16.+uS*3.))*kw:0.;
    float dens=(shell*(.28+1.15*waist)+exp(-pow((R3-.42)/.2,2.))*.18)*(.45+.8*n)*(.6+.8*fil)*(1.-.75*knot);
    /* teal inside, then green-yellow, orange and red at the rim (going straight from teal to orange passed through grey) */
    vec3 col=mix(vec3(.16,.72,.86),vec3(.62,.92,.45),smoothstep(.36,.52,R3));
    col=mix(col,vec3(1.,.6,.2),smoothstep(.5,.62,R3)); col=mix(col,vec3(.95,.2,.3),smoothstep(.62,.74,R3));
    C+=col*dens*(2.2/12.); cov+=dens/12.;
  }
  C+=vec3(.2,.7,.95)*exp(-rp*rp*7.)*.2;                           /* the thin glow filling it */
  C+=vec3(.85,.28,.35)*exp(-pow((rp-.98)/.2,2.))*.1*(.4+fil);     /* the faint outer halo */
  C+=vec3(1.)*exp(-dot(p,p)*1500.)*1.6;                           /* the white dwarf left in the middle */
  /* the gas hides what lies behind it, as much as there is of it: seen through (only added on top), the
     sky's band and its dark lanes ran straight across the nebula as a line */
  float a=clamp(cov*1.6+exp(-rp*rp*3.)*.35,0.,.92)*(1.-smoothstep(.95,1.25,rp));
  float e=edgeFade();
  o=vec4(C*uA*e,a*uA*e);
}`});

  /* ---------- a star eating its companion ---------- */
  skyWonder("binary",{at:{d:[.61,.12],m:[.05,-.1]},z:110,R:5.2,blend:"over",sight:"binary",vis:.74,shader:COMMON+N3+`
uniform float uPh;    /* where they are on their orbit */
void main(){
  vec2 p=vQ*1.3; const float ci=.34;                         /* the orbit, seen tilted */
  vec2 A=-.42*vec2(cos(uPh),sin(uPh)*ci), B=.88*vec2(cos(uPh),sin(uPh)*ci);
  float bFront=sin(uPh)<0.?1.:0.;                             /* the white dwarf is in front of the giant */
  vec2 toB=normalize(B-A), dA=p-A;
  /* pulled into a drop: round all over, drawn out to a point only towards its companion */
  float ct=dot(dA,toB)/max(length(dA),1e-4), Rg=.4*(1.+.3*pow(max(ct,0.),5.));
  float rg=length(dA)/Rg;
  vec3 C=vec3(0.); float a=0.;
  /* the disk round the white dwarf, and the hot spot where the stream lands */
  vec2 dB=p-B; float rd=length(dB/vec2(1.,ci+.08));
  float disk=smoothstep(.27,.06,rd)*smoothstep(.012,.03,rd);
  vec3 dc=mix(vec3(.75,.85,1.),vec3(1.,.55,.3),smoothstep(.04,.24,rd))*disk*(1.3+.7*fbm(vec2(atan(dB.y,dB.x)*3.-uT*2.,rd*20.),3));
  vec2 hot=B-toB*.16; dc+=vec3(1.,.9,.8)*exp(-dot(p-hot,p-hot)*900.)*1.5;
  dc+=vec3(.85,.93,1.)*exp(-dot(dB,dB)*9000.)*3.;
  /* the stream: from the giant's tip, curving (the orbit turns under it) onto the disk */
  float st=0.; vec2 L1=A+toB*.4*1.3*1.02, nrm=vec2(-toB.y,toB.x);     /* from the tip of the drop */
  for(int i=0;i<18;i++){ float s=float(i)/17.; vec2 q=mix(L1,hot,s)+nrm*sin(s*3.1416)*.07;
    st+=exp(-dot(p-q,p-q)*(4000.-2500.*s))*(1.-.4*s); }
  vec3 sc=mix(vec3(1.,.4,.18),vec3(1.,.8,.6),.5)*st*.5*(.7+.5*fbm(p*20.-uT,2));
  /* the red giant: a ball, not a disk. Its surface is a few huge boiling cells (a red giant has so few
     they can be seen) on a turning sphere, darker and redder towards its edge, where we look through
     cooler gas; a thin hot glow rims it */
  vec3 gc=vec3(0.); float ga=0.;
  if(rg<1.){ float mu=sqrt(1.-rg*rg);
    vec3 nrm=vec3(dA/Rg,mu), sp=vec3(nrm.x*cos(uT*.02)+nrm.z*sin(uT*.02),nrm.y,-nrm.x*sin(uT*.02)+nrm.z*cos(uT*.02));
    float cell=fbm3(sp*3.2+uS,4), fine=vn3(sp*14.+uT*.05);
    float gran=smoothstep(.25,.75,cell)*.8+fine*.2;
    float limb=pow(mu,.55);
    gc=mix(vec3(.7,.14,.05),mix(vec3(.95,.34,.1),vec3(1.,.72,.4),gran),limb)*(.45+.75*limb)*(.75+.5*gran)*1.25;
    ga=smoothstep(1.,.965,rg); gc*=ga; }                   /* (a soft edge: a hard one drew a dark outline) */
  gc+=vec3(1.,.38,.15)*exp(-max(rg-1.,0.)*9.)*.45*(1.-ga)+vec3(1.,.3,.12)*exp(-max(rg-1.,0.)*2.5)*.12*(1.-ga);
  vec3 other=dc+sc; float oa=clamp(disk*.9,0.,1.);
  C=bFront>.5?other+gc*(1.-oa):gc+other*(1.-ga);        /* whichever is in front hides the other */
  a=max(ga,oa*.7);
  float e=edgeFade();
  o=vec4(C*uA*e,a*uA*e);
}`,uniforms(api,u,t){ set(u,"uPh",t*TAU/70); }});

  /* ---------- the Antennae: two galaxies colliding ---------- */
  /* NGC 4038/4039: two spirals in the middle of crashing. Their pull has thrown out two long
     curved tails of stars (the "antennae"); where their disks meet, the squeezed gas lights
     up in hundreds of pink knots of newborn stars, crossed by lanes of dust. */
  skyWonder("antennae",{at:{d:[.93,-.76],m:[-.38,-.5]},z:160,R:9,rot:-.3,blend:"over",sight:"antennae",vis:.9,shader:COMMON+`
float seg(vec2 p,vec2 a,vec2 b){ vec2 pa=p-a, ba=b-a; float h=clamp(dot(pa,ba)/dot(ba,ba),0.,1.); return length(pa-ba*h); }
/* a tidal tail: a spiral arc thrown out of a disk, wider and fainter as it goes */
vec2 tail(vec2 p,vec2 c,float th0,float dir,float sd){
  float best=1e3, bs=0.; vec2 prev=c;
  for(int i=1;i<=22;i++){ float s=float(i)/22.;
    float th=th0+dir*s*2.5, R=.12+.8*pow(s,1.15);
    vec2 q=c+R*vec2(cos(th),sin(th)*.78);
    float d=seg(p,prev,q); if(d<best){ best=d; bs=s; } prev=q; }
  /* a stream of stars, not a smooth band: bright and narrow near its disk, wider, fainter and more broken
     up further out, grainy all along (clumps and gaps of stars), with a faint wide glow around it */
  float w=.014+.06*bs;
  float grain=pow(fbm(p*16.+sd,4),1.6)*1.9, clumps=smoothstep(.3,.75,fbm(p*5.+sd*1.7,3));
  float lum=exp(-pow(best/w,2.))*(1.-.8*bs)*(.25+grain)*(.45+.8*clumps)+exp(-pow(best/(w*2.8),2.))*(1.-bs)*.12;
  return vec2(lum,bs);
}
/* one of the two disks, pulled out of shape */
float disk(vec2 p,vec2 c,float ang,float sq){
  vec2 d=p-c; float ca=cos(ang), sa=sin(ang); d=vec2(ca*d.x-sa*d.y,sa*d.x+ca*d.y)*vec2(1.,sq);
  d+=.04*vec2(fbm(d*5.+3.,3)-.5,fbm(d*5.+9.,3)-.5);
  float r=length(d), th=atan(d.y,d.x), arm=.5+.5*sin(2.*th-5.5*log(r+.03)-uT*.12);   /* its arms turn */
  return exp(-r/.085)*1.1+exp(-r/.19)*(.35+.65*arm)*.95;
}
void main(){
  /* the two disks in the middle, one tail thrown towards us and the other away: they slide apart as the view turns */
  /* the pair is a 3D thing turning slowly (and as the camera goes round): its plane foreshortens and swings,
     the cores circle each other a little, the tails sweep */
  float yaw=.38*sin(uT*.045)+uPar.x*1.3, pit=.2*sin(uT*.033+1.)+uPar.y*.9;
  vec2 p=vQ*1.05; p=vec2(p.x/max(cos(yaw),.55),p.y/max(cos(pit),.7)); p+=vec2(sin(yaw),sin(pit))*.06;
  float orb=uT*.03; vec2 c1=vec2(-.09,.05)+.02*vec2(cos(orb),sin(orb)), c2=vec2(.1,-.05)-.02*vec2(cos(orb),sin(orb));
  float d1=disk(p,c1,.5,1.5), d2=disk(p,c2,-.8,1.8);
  float sw=.12*sin(uT*.05);
  vec2 T1=tail(p-uPar*.45-vec2(sin(yaw),0.)*.08,c1,1.9+sw,1.,1.+uT*.03), T2=tail(p+uPar*.45+vec2(sin(yaw),0.)*.08,c2,-1.25-sw,1.,5.-uT*.03);
  /* the old stars: warm light near the hearts, bluer out in the disks and the tails */
  vec3 C=mix(vec3(.62,.7,1.),vec3(1.,.84,.6),smoothstep(.3,1.2,d1+d2))*(d1+d2)*.75;
  C+=vec3(1.,.9,.72)*(exp(-dot(p-c1,p-c1)*700.)+exp(-dot(p-c2,p-c2)*900.)*.8)*1.2;
  C+=mix(vec3(.72,.8,1.),vec3(.95,.9,.82),.35)*(T1.x+T2.x)*.62;
  /* where they meet: dust lanes, and knots of newborn stars (pink gas, blue clusters) */
  vec2 m=(p-vec2(.0,.0))*vec2(1.,1.35); float meet=exp(-dot(m,m)*10.);
  float lane=pow(1.-abs(fbm(p*7.+uS,5)*2.-1.),5.)*meet*smoothstep(.1,.4,d1+d2);
  float loop=exp(-pow((length((p-c1)*vec2(1.,1.4))-.13)/.05,2.))+exp(-pow((length((p-c2)*vec2(1.,1.5))-.1)/.045,2.));
  float knotsWhere=clamp(loop*.8+meet*.9,0.,1.);
  vec2 pk=p-uPar*.12;                                     /* the knots of new stars sit on the near side of the crash */
  vec2 g=floor(pk*46.); float hs=h12(g+uS); vec2 f=fract(pk*46.)-.5-(vec2(h12(g+1.7),h12(g+4.2))-.5)*.5;
  float knot=step(.72,hs)*exp(-dot(f,f)*55.)*knotsWhere*(.8+.2*sin(uT*1.3+hs*30.));
  C+=mix(vec3(1.,.32,.62),vec3(.55,.7,1.),step(.87,hs))*knot*1.9;
  C+=vec3(1.,.35,.55)*pow(fbm(p*9.+uS*2.,4),3.)*knotsWhere*.9;                       /* their pink glow */
  /* single bright stars scattered along the tails */
  vec2 g2=floor(p*60.); float h2=h12(g2+uS+9.); vec2 f2=fract(p*60.)-.5;
  C+=vec3(.8,.87,1.)*step(.9,h2)*exp(-dot(f2,f2)*80.)*clamp((T1.x+T2.x)*1.5,0.,1.)*.8;
  float e=edgeFade();
  o=vec4(C*(1.-lane*.7)*uA*e,lane*.65*uA*e);
}`});

  /* ---------- now and then, a supernova ---------- */
  let nova=null, nextNova=0;
  /* its life, seen in seconds: k runs 0 → 1 over its 70 s. The blast wave leaves the star at once and
     reaches the camera WAVE_T seconds later (eased: fast, then slowing as it spreads) */
  const NOVA_DUR=70, WAVE_T=7;
  const novaW={id:"nova",shaders:{main:COMMON+`
uniform float uK;     /* how far along its life (0 to 1) */
void main(){
  vec2 p=vQ; float r=length(p), k=uK;
  /* its light: a sudden rise, a peak, then weeks of fading, seen in seconds */
  float B=smoothstep(0.,.02,k)*(exp(-k*4.2)*.9+.1*(1.-k));
  /* the colour: blue-white when it bursts, yellow, then red as it cools */
  vec3 col=mix(mix(vec3(.72,.84,1.),vec3(1.,.9,.72),smoothstep(.04,.3,k)),vec3(1.,.55,.36),smoothstep(.3,.85,k));
  /* the star itself and a soft round glow (no diffraction spikes: hard lines across the sky) */
  vec3 C=col*B*(exp(-r*r*2600.)*6.+exp(-r*r*180.)*1.1+exp(-r*9.)*.28);
  /* the flash of the shock breaking out, in the first moments */
  C+=vec3(.75,.9,1.)*exp(-r*r*14.)*exp(-k*60.)*smoothstep(0.,.006,k)*.8;
  /* much later: the debris, a ragged small shell of glowing gas (hydrogen red, oxygen teal) */
  float R=.05+.2*smoothstep(.2,1.,k), a=atan(p.y,p.x);
  float fil=fbm(vec2(a*2.5,r*7.)+uS,4), rag=R*(1.+.3*(fbm(vec2(a*2.,uS),3)-.5));
  float shell=(exp(-pow((r-rag)/(.03+.04*k),2.))+.25*smoothstep(rag,rag*.3,r))*smoothstep(.2,.55,k)*(1.-smoothstep(.85,1.,k));
  C+=mix(vec3(.3,.85,.8),vec3(1.,.3,.35),smoothstep(.45,.8,fil))*shell*pow(fil,1.5)*1.1;
  o=vec4(C*uA*edgeFade()*(1.-smoothstep(.9,1.,k)),0.);
}`,
  /* the blast wave: a shell of hot gas rushing out of the star, seen growing as it comes towards us, its
     front ragged and boiling, blue-white at its leading edge and orange behind it, the space inside
     glowing; it fills the sky and, as it sweeps over the camera, everything flares white for a moment */
  wave:COMMON+`
uniform float uW;     /* how far it has come: 0 at the star, 1 at the camera */
void main(){
  vec2 p=vQ; float r=length(p), a=atan(p.y,p.x), w=uW;
  float boil=fbm(vec2(a*4.,w*6.-uT*.4)+uS,4), fine=fbm(p*9./max(w,.08)+uS+uT*.2,3);
  float wr=w*(1.+.07*(boil-.5)*2.);                       /* the front is ragged */
  float th=.008+.035*w;                                    /* thicker as it comes closer */
  float lead=exp(-pow((r-wr)/th,2.)), trail=exp(-pow((r-wr+th*1.8)/(th*1.6),2.));
  float inside=smoothstep(wr,wr*.2,r)*(.25+.75*fine);
  float fade=1.-smoothstep(.85,1.08,w);                    /* it has passed us */
  vec3 C=vec3(.7,.86,1.)*lead*(.6+.7*fine)*1.15+vec3(1.,.55,.25)*trail*(.5+.8*boil)*.9
        +vec3(1.,.62,.38)*inside*.12*(1.-w*.5);
  C*=fade*(.35+.65*smoothstep(0.,.12,w));
  /* sweeping over the camera: the whole sky flares, then lets go */
  C+=vec3(.78,.88,1.)*exp(-pow((w-1.)/.06,2.))*.45;
  o=vec4(C*uA,0.);
}`},
    draw(api,ph,t,now){
      api0=api;
      const clock=now;
      if(ph==="far"&&!nova&&api.alive()&&!api.robot){
        if(!nextNova) nextNova=clock+180+Math.random()*240;
        if(clock>=nextNova) spawnNova(api,clock);
      }
      if(!nova) return;
      const age=clock-nova.t0, k=age/NOVA_DUR;
      if(k>=1){ nova=null; nextNova=clock+240+Math.random()*300; return; }
      const a=api.onScreen(nova.p); if(!a) return;
      if(ph==="far"){
        const R=Math.min(api.W,api.H)*.16;
        const u=api.sprite(novaW.prog.main,a[0],a[1],R,R,0);
        set(u,"uK",k); set(u,"uA",api.fade); set(u,"uS",nova.seed); set(u,"uT",t);
        api.add(); api.draw(); api.need();
      } else if(ph==="near"&&age<WAVE_T*1.15){
        /* over everything else: a square round the star big enough to reach every corner of the screen */
        const x=Math.min(1.12,age/WAVE_T), w=1-Math.pow(1-Math.min(1,x),2.2)+Math.max(0,x-1);
        const R=Math.hypot(api.W,api.H)*1.05;
        const u=api.sprite(novaW.prog.wave,a[0],a[1],R,R,0);
        set(u,"uW",w); set(u,"uA",api.fade); set(u,"uS",nova.seed); set(u,"uT",t);
        api.add(); api.draw(); api.need();
      }
    }};
  function spawnNova(api,clock,x,y){
    /* far away, somewhere away from the middle of the screen */
    if(x===undefined) do{ x=Math.random()*1.8-.9; y=Math.random()*1.7-.85; }while(Math.abs(x)<.35&&Math.abs(y)<.35);
    nova={t0:clock,p:api.world({d:[x,y],m:[x,y]},900),seed:Math.random()*10};
  }
  window.UNIVERSE_EXTRAS.push(novaW);

  /* ---------- the Earth and the Moon (where the opening starts) ----------
     Far behind home: going back to them is flying back the way the opening came. Each one is a
     sight of its own (its sphere and a little of its air) */
  const EARTH_P=[-21,13,-392], EARTH_R=15, MOON_P=[22,-16,-350], MOON_R=4.5;
  const swap={};                                       /* when each real picture arrived (to fade it in) */
  /* the Earth's clouds painted once round the globe (longitude across, latitude up): its shader reads them */
  const CLOUD_FS=N3+`
/* the clouds at a point (their own frame, drifting): where the climate makes them, the tropics' line of
   storms and the storm tracks of middle latitudes; few over the deserts of the belts between; wisps and
   curling fronts rather than balls */
float cloudAt(vec3 cs,bool full){
  /* (the shadows only need the clouds' rough shape: fewer layers of noise, so the Earth stays light to draw) */
  int o1=full?3:2, o2=full?5:3;
  vec3 cw=vec3(fbm3(cs*2.6+1.,o1),fbm3(cs*2.6+4.,o1),fbm3(cs*2.6+8.,o1))-.5;
  float la=asin(clamp(cs.y,-1.,1.));
  float belt=exp(-pow(la/.13,2.))*.75+exp(-pow((abs(la)-.9)/.28,2.));
  float base=fbm3(cs*vec3(3.6,5.2,3.6)+cw*2.4,o2);
  float c=smoothstep(.56-.13*belt,.78-.1*belt,base);
  return c*(full?.45+.55*fbm3(cs*22.+cw*4.,2):.75)*.9;
}
in vec2 vUv; out vec4 o;
void main(){
  float lon=(vUv.x-.5)*6.2831853, lat=(vUv.y-.5)*3.1415927;
  vec3 s=vec3(cos(lat)*sin(lon),sin(lat),-cos(lat)*cos(lon));
  o=vec4(cloudAt(s,true),0.,0.,1.);
}`;
  const earth={id:"earth",early:true,
    /* its pictures start loading at once: the first flight begins beside it */
    layout(api){ ["earth-day.jpg","earth-aux.jpg","moon.jpg"].concat(api.phone?[]:["moon-4k.jpg"]).forEach(n=>api.image(IMG(n))); },
    /* solid: flights go round them (universe.js), never through */
    solids:[{p:EARTH_P,R:EARTH_R},{p:MOON_P,R:MOON_R}],
    sights:[{id:"earth",p:EARTH_P,R:EARTH_R*1.05,k:.92},{id:"moon",p:MOON_P,R:MOON_R*1.02,k:.62}],
    shaders:{main:COMMON+N3+`
uniform vec3 uL;      /* where the sunlight comes from */
uniform float uSpin;
uniform sampler2D uDay, uAux;  /* the real Earth (NASA's Blue Marble), and its night lights, seas and heights */
uniform sampler2D uCloud; uniform float uCl;   /* its clouds, painted once (a map round the globe), when ready */
uniform float uTex, uLod;      /* whether they are here; how blurred to read them (the Earth's size on the screen) */
/* a real ball, traced per pixel: the ray of this pixel from the camera, against a sphere (its centre in the
   camera's axes, x right, y down, z ahead; its radius). Seen up close or off to the side it keeps its true
   shape, and the camera can fly right past it */
uniform vec3 uCen; uniform float uRad; uniform vec4 uView;   /* (render width, height, css width, focal length in css px) */
vec3 rayD(){ float k=uView.z/uView.x; vec2 c=vec2(gl_FragCoord.x,uView.y-gl_FragCoord.y)*k;
  return normalize(vec3((c.x-uView.z*.5)/uView.w,(c.y-uView.y*k*.5)/uView.w,1.)); }
/* how close (in its radii) the ray passes its centre, the direction from the centre to that point, and b: how far ahead */
float pass(vec3 d,out vec3 off,out float b){ vec3 c=uCen/uRad; b=dot(d,c); vec3 cl=d*b-c; float rr=length(cl); off=cl/max(rr,1e-5); return b>0.?rr:1e3; }
vec3 hitN(vec3 d,float rr,float b){ float r1=min(rr,.9999); return normalize(d*(b-sqrt(1.-r1*r1))-uCen/uRad); }

/* turned about its axis (by a), then its axis leant 23° */
vec3 turnS(vec3 n,float a){ float c=cos(a), s=sin(a); vec3 m=vec3(c*n.x+s*n.z,n.y,-s*n.x+c*n.z);
  float t=.41, ct=cos(t), st=sin(t); return vec3(ct*m.x-st*m.y,st*m.x+ct*m.y,m.z); }
/* the clouds at a point (their own frame, drifting): where the climate makes them, the tropics' line of
   storms and the storm tracks of middle latitudes; few over the deserts of the belts between; wisps and
   curling fronts rather than balls */
float cloudAt(vec3 cs,bool full){
  /* (the shadows only need the clouds' rough shape: fewer layers of noise, so the Earth stays light to draw) */
  int o1=full?3:2, o2=full?5:3;
  vec3 cw=vec3(fbm3(cs*2.6+1.,o1),fbm3(cs*2.6+4.,o1),fbm3(cs*2.6+8.,o1))-.5;
  float la=asin(clamp(cs.y,-1.,1.));
  float belt=exp(-pow(la/.13,2.))*.75+exp(-pow((abs(la)-.9)/.28,2.));
  float base=fbm3(cs*vec3(3.6,5.2,3.6)+cw*2.4,o2);
  float c=smoothstep(.56-.13*belt,.78-.1*belt,base);
  return c*(full?.45+.55*fbm3(cs*22.+cw*4.,2):.75)*.9;
}
/* the height of the ground: a few big continents with ragged, warped coasts */
float ground(vec3 s){
  vec3 w=vec3(fbm3(s*1.4+uS,4),fbm3(s*1.4+uS+5.2,4),fbm3(s*1.4+uS+9.7,4))-.5;
  return fbm3(s*1.5+w*1.3+uS,6)+.05*fbm3(s*11.,3);
}
void main(){
  vec3 d=rayD(), off; float b, rr=pass(d,off,b);
  vec3 C=vec3(0.); float a=0.;
  vec3 L=normalize(uL);
  if(rr<1.){
    vec3 n=hitN(d,rr,b), s=turnS(n,uSpin);
    float mu=dot(n,L), day=smoothstep(-.08,.14,mu);
    float lat=abs(s.y), landM, rmu=mu, lights=0., ice=0., desert=0.;
    vec3 surf;
    if(uTex>.5){
      /* the real one: its colours by day, its cities by night, where its seas are, and its heights */
      vec2 uv=vec2(.5+atan(s.x,-s.z)/6.2831853,.5+asin(clamp(s.y,-1.,1.))/3.1415927);
      float lod=uLod+.5*log2(1./max(dot(n,-d),.1));                   /* blurrier where it is seen slantwise */
      surf=pow(textureLod(uDay,uv,lod).rgb,vec3(2.2))*.95;
      vec3 ax=textureLod(uAux,uv,lod).rgb;
      landM=1.-smoothstep(.3,.7,ax.g);
      lights=pow(ax.r,1.8)*1.6;
      /* the relief catches the low sun: mountains lit on one flank, shaded on the other */
      vec2 dp=exp2(max(lod,0.))*vec2(1./2048.,1./1024.);
      float tx=textureLod(uAux,uv+vec2(dp.x,0.),lod).b-textureLod(uAux,uv-vec2(dp.x,0.),lod).b;
      float ty=textureLod(uAux,uv+vec2(0.,dp.y),lod).b-textureLod(uAux,uv-vec2(0.,dp.y),lod).b;
      vec3 E=normalize(vec3(-s.z,0.,s.x)+vec3(1e-5,0.,0.)), Nn=normalize(vec3(0.,1.,0.)-s*s.y+vec3(0.,1e-5,0.));
      vec3 sn=normalize(s-(E*tx+Nn*ty)*5.);
      rmu=mix(mu,dot(sn,turnS(L,uSpin)),landM*smoothstep(-.1,.2,mu));
      ice=smoothstep(.93,.97,lat);
    } else {
    float h=ground(s), sea=.545; landM=smoothstep(sea,sea+.01,h);
    /* the climate: hot and wet at the equator, deserts in the belts either side, cold towards the poles */
    float temp=1.-lat*1.2+.18*(fbm3(s*3.+2.,3)-.5)-max(h-sea,0.)*1.6;
    float wet=fbm3(s*2.2+7.,4)+.25*(1.-smoothstep(.0,.25,lat));
    desert=smoothstep(.5,.62,temp)*smoothstep(.56,.4,wet);
    vec3 forest=mix(vec3(.05,.13,.04),vec3(.13,.2,.07),fbm3(s*9.,3)), jungle=vec3(.02,.1,.03);
    vec3 sand=mix(vec3(.6,.47,.3),vec3(.76,.6,.4),fbm3(s*13.,3)), tundra=mix(vec3(.3,.28,.22),vec3(.4,.38,.33),fbm3(s*7.,3));
    vec3 lc=mix(forest,jungle,smoothstep(.72,.9,temp));
    lc=mix(lc,sand,desert);
    lc=mix(lc,tundra,smoothstep(.36,.2,temp));
    lc=mix(lc,vec3(.34,.3,.27),smoothstep(sea+.09,sea+.2,h)*.75);                 /* bare mountains */
    lc*=.8+.4*fbm3(s*26.,3);
    float snow=smoothstep(.2,.1,temp)*landM;
    /* the sea: deep blue far from the coast, turquoise shallows along it */
    vec3 oc=mix(vec3(.02,.12,.24),vec3(.004,.028,.09),smoothstep(sea-.01,sea-.14,h));
    oc=mix(oc,vec3(.03,.24,.3),smoothstep(sea-.035,sea,h)*.8);
    surf=mix(oc,lc,landM);
    ice=smoothstep(.86,.92,lat+.04*fbm3(s*7.,3));
    surf=mix(surf,vec3(.88,.92,.97),max(ice,snow));
    /* city lights: towns scattered on land, thicker along the coasts, joined by roads */
    vec3 g=floor(s*95.), fr=fract(s*95.)-.5; float hs=h31(g+uS);
    float town=step(.9,hs)*exp(-dot(fr,fr)*30.)*(.3+hs);
    float roads=pow(1.-abs(fbm3(s*48.,3)*2.-1.),14.)*.18;
    float settled=smoothstep(.56,.7,fbm3(s*4.5+11.,4))*(1.+1.5*smoothstep(sea+.06,sea,h));
    lights=landM*(1.-ice)*(1.-desert*.7)*settled*(town+roads)*1.5;
    }
    /* clouds: their own slow drift over the ground, in swirls and long bands */
    vec3 cs=turnS(n,uSpin*1.18+uT*.004);
    /* the clouds: read from their map (painted once: the same field, a few reads instead of dozens of layers of
       noise per pixel and frame); its shadow a little towards the Sun */
    vec2 cuv=vec2(.5+atan(cs.x,-cs.z)/6.2831853,.5+asin(clamp(cs.y,-1.,1.))/3.1415927);
    vec3 csh=turnS(normalize(n+L*.01),uSpin*1.18+uT*.004);
    vec2 cuv2=vec2(.5+atan(csh.x,-csh.z)/6.2831853,.5+asin(clamp(csh.y,-1.,1.))/3.1415927);
    float clod=uLod-.4+.5*log2(1./max(dot(n,-d),.1));
    float cl=uCl>.5?textureLod(uCloud,cuv,clod).r:cloudAt(cs,true);
    /* sunlight: reddened where it grazes the ground; the clouds' shadows fall just beside them */
    float sunL=max(rmu,0.);
    vec3 sunC=mix(vec3(1.,.42,.18),vec3(1.,.97,.93),smoothstep(0.,.3,mu));
    float shade=1.-.45*(uCl>.5?textureLod(uCloud,cuv2,clod+.8).r:cloudAt(csh,false));
    vec3 dayC=mix(surf*shade*(sunL*1.2+.015),vec3(.96,.97,1.)*(max(mu,0.)*1.2+.015),cl)*sunC;
    /* the Sun's glint on the sea: a sharp spot in a wider sheen, hidden under clouds */
    vec3 v=-d, hv=normalize(L+v); float nh=max(dot(n,hv),0.);
    dayC+=vec3(1.,.9,.75)*(pow(nh,900.)*.7+pow(nh,70.)*.05)*(1.-landM)*(1.-cl)*day;
    /* the night side: nearly black, the clouds faintly seen by the Moon */
    vec3 nightC=(surf*.03+vec3(.015,.02,.04)*cl)*(1.-day);
    /* city lights */
    nightC+=vec3(1.,.66,.3)*lights*(1.-cl*.8)*(1.-day);
    /* auroras round the poles, over the night: thin green curtains, crimson at their tops */
    float ring=exp(-pow((lat-.87+.015*sin(atan(s.z,s.x)*5.+uT*.05))/.03,2.)), ray=ring*(1.-day)>.002?pow(fbm3(s*vec3(22.,2.,22.)+vec3(0.,uT*.15,0.),4),2.5):0.;   /* (its noise only where there is one) */
    nightC+=mix(vec3(.25,1.,.55),vec3(.95,.25,.45),smoothstep(.87,.91,lat))*ring*ray*(1.-day)*.6;
    C=dayC+nightC; a=1.;
    /* the air seen through: a blue haze, thicker towards the edge, over the day side */
    float thick=pow(1.-max(dot(n,-d),0.),2.6);
    C=mix(C,vec3(.32,.55,1.)*smoothstep(-.2,.35,mu)*.8,thick*.55);
  }
  /* its thin air beyond the edge: blue where the Sun shines through, warm at the dusk line, a thread over the night */
  float out_=max(rr-1.,0.);
  float limb=exp(-out_*45.)*smoothstep(.975,1.,rr)+exp(-abs(rr-1.)*70.)*.35;
  float side=dot(normalize(off-.3*normalize(uCen)),L);
  vec3 air=mix(vec3(1.,.5,.25),vec3(.35,.6,1.),smoothstep(-.05,.35,side));
  C+=air*limb*smoothstep(-.3,.2,side)*1.1;
  a=max(a,limb*smoothstep(-.3,.2,side)*.7);
  o=vec4(C*uA,a*uA);
}`,moon:COMMON+N3+`
uniform vec3 uL;
uniform sampler2D uMoonT; uniform float uTex, uLod;
uniform float uQ;     /* how far its north is turned from straight up tonight (the parallactic angle) */
/* a real ball, traced per pixel: the ray of this pixel from the camera, against a sphere (its centre in the
   camera's axes, x right, y down, z ahead; its radius). Seen up close or off to the side it keeps its true
   shape, and the camera can fly right past it */
uniform vec3 uCen; uniform float uRad; uniform vec4 uView;   /* (render width, height, css width, focal length in css px) */
vec3 rayD(){ float k=uView.z/uView.x; vec2 c=vec2(gl_FragCoord.x,uView.y-gl_FragCoord.y)*k;
  return normalize(vec3((c.x-uView.z*.5)/uView.w,(c.y-uView.y*k*.5)/uView.w,1.)); }
/* how close (in its radii) the ray passes its centre, the direction from the centre to that point, and b: how far ahead */
float pass(vec3 d,out vec3 off,out float b){ vec3 c=uCen/uRad; b=dot(d,c); vec3 cl=d*b-c; float rr=length(cl); off=cl/max(rr,1e-5); return b>0.?rr:1e3; }
vec3 hitN(vec3 d,float rr,float b){ float r1=min(rr,.9999); return normalize(d*(b-sqrt(1.-r1*r1))-uCen/uRad); }

/* a field of craters: cells of a 3D grid (s cells per unit), each holding at most one crater, at a
   random place and of a random size. h: the height (a bowl, a raised rim fading outwards), g: its
   slope (to shade the relief), br: how fresh (a few young craters are bright inside) */
void craters(vec3 q,float s,float sd,float depth,inout float h,inout vec3 g,inout float br){
  vec3 u=q*s, iu=floor(u);
  for(int z=-1;z<=1;z++) for(int y=-1;y<=1;y++) for(int x=-1;x<=1;x++){
    vec3 c=iu+vec3(float(x),float(y),float(z));
    float r0=h31(c+sd);
    if(r0>.45) continue;                                   /* most cells hold none */
    vec3 o=c+.5+.7*(vec3(h31(c+sd+1.3),h31(c+sd+2.9),h31(c+sd+4.7))-.5);
    float R=.2+.32*h31(c+sd+6.1);
    vec3 dv=u-o; float l=length(dv), d=l/R;
    if(d>1.8) continue;
    float hh, dh;
    if(d<1.){ hh=(d*d-1.)*depth; dh=2.*d*depth; }
    else { float e=(d-1.)/.3; hh=exp(-e*e)*depth*.45; dh=hh*(-2.*e/.3); }
    h+=hh; g+=dh*dv/(max(l,1e-4)*R)*s;
    br+=(1.-smoothstep(.75,1.2,d))*step(r0,.05);
  }
}
/* the rays of a young crater: thin bright streaks thrown out all round it */
float rays(vec3 n,vec3 c,float reach,float sd){
  float d=acos(clamp(dot(n,c),-1.,1.));
  vec3 a=normalize(cross(c,vec3(0.,1.,0.))), b=cross(c,a);
  float an=atan(dot(n,b),dot(n,a));
  /* uneven streaks: each fades in and out along its length, so they read as splashes, not spokes */
  float st=pow(.5+.5*sin(an*13.+sin(an*5.+sd)*2.3+sd),12.)+pow(.5+.5*sin(an*23.+sd*2.),18.)*.5;
  st*=.35+.65*vn3(vec3(an*6.,d*9.,sd));
  return st*exp(-d/reach)*smoothstep(.015,.06,d)+exp(-d*d/.0004)*1.2;
}
void main(){
  vec3 d=rayD(), off; float b, rr=pass(d,off,b);
  float aa=max(fwidth(rr),1e-3);
  if(rr>1.+aa){ o=vec4(0.); return; }
  vec3 n=hitN(d,rr,b), L=normalize(uL);
  /* everything turned about the line of sight, so its north points where it does in tonight's sky */
  float cq=cos(uQ), sq=sin(uQ);
  n=vec3(cq*n.x+sq*n.y,-sq*n.x+cq*n.y,n.z); d=vec3(cq*d.x+sq*d.y,-sq*d.x+cq*d.y,d.z); L=vec3(cq*L.x+sq*L.y,-sq*L.x+cq*L.y,L.z);
  vec3 nb, tint; float alb;
  if(uTex>.5){
    /* the real one (NASA's Lunar Reconnaissance Orbiter): its near side, which always faces the Earth */
    vec2 uv=vec2(.5+atan(n.x,-n.z)/6.2831853,.5+asin(clamp(n.y,-1.,1.))/3.1415927);
    float lod=uLod+.5*log2(1./max(dot(n,-d),.1));
    vec3 tx=textureLod(uMoonT,uv,lod).rgb;
    alb=pow(tx.r,2.2)*1.35+.015;
    vec2 dp=exp2(max(lod,0.))*vec2(1./2048.,1./1024.);
    float bx=textureLod(uMoonT,uv+vec2(dp.x,0.),lod).g-textureLod(uMoonT,uv-vec2(dp.x,0.),lod).g;
    float by=textureLod(uMoonT,uv+vec2(0.,dp.y),lod).g-textureLod(uMoonT,uv-vec2(0.,dp.y),lod).g;
    vec3 E=normalize(vec3(-n.z,0.,n.x)+vec3(1e-5,0.,0.)), Nn=normalize(vec3(0.,1.,0.)-n*n.y+vec3(0.,1e-5,0.));
    nb=normalize(n-(E*bx+Nn*by)*3.);
    tint=mix(vec3(.86,.9,.96),vec3(.98,.95,.9),smoothstep(.08,.2,alb));    /* seas a little blue-grey, highlands warm */
  } else {
  /* the seas: broad smooth plains of old dark lava, with soft ragged shores */
  float mf=fbm3(n*1.2+vec3(2.,.3,1.1),5)+.06*fbm3(n*6.,3);
  float maria=smoothstep(.5,.6,mf);
  /* craters at three sizes, fewer on the seas (they are younger than the highlands) */
  float h=0., br=0.; vec3 g=vec3(0.);
  float w=1.-.7*maria;
  craters(n,2.6,1.,.9*w,h,g,br); craters(n,6.5,7.,.6*w,h,g,br); craters(n,15.,13.,.4*w,h,g,br); craters(n,34.,19.,.25*(1.-.4*maria),h,g,br);
  /* the relief tilts the surface (in its own plane) and so catches or loses the sunlight */
  vec3 gt=g-dot(g,n)*n; nb=normalize(n-gt*.032);
  /* two young craters with rays, where the real ones are (Tycho low in the south, Copernicus left of the middle) */
  float ry=rays(n,normalize(vec3(-.1,.62,-.78)),.42,1.)+rays(n,normalize(vec3(-.32,-.12,-.94)),.18,4.)*.5;
  alb=mix(.66,.3,maria)*(.9+.2*fbm3(n*24.,3))+br*.35+ry*.17;
  /* the seas faintly blue-grey (titanium in the old lava), the highlands a warm grey */
  tint=mix(vec3(.98,.95,.9),vec3(.86,.9,.96),maria*(.6+.4*fbm3(n*4.+9.,3)));
  }
  /* how the Moon reflects: nearly as bright at its edge as in its middle (Lommel–Seeliger), not like a matte ball */
  float ci=dot(nb,L), ce=max(dot(n,-d),.05);
  float lit=max(ci,0.)/(max(ci,0.)+ce)*2., term=smoothstep(-.03,.05,dot(n,L));
  vec3 C=tint*alb*lit*term*1.05+vec3(.35,.45,.7)*.03*alb*(1.-term);   /* earthshine on the dark side */
  float e=1.-smoothstep(1.-aa,1.+aa,rr);
  o=vec4(C*uA*e,e*uA);
}`},
    draw(api,ph,t){
      if(ph!=="near") return;
      api0=api;
      const a=api.appear(earth);
      /* how blurred to read a map of 2048 texels round, for a ball of this many pixels across */
      const lodFor=(r,size)=>Math.log2(size/TAU/Math.max(1,r*api.scale));
      /* a ball on the screen: the square that holds it (and its air), or the whole screen when the camera is
         right beside it (part of it may be behind the camera); null when it is not in view at all */
      const ball=(P,R,air)=>{
        const q=api.toCam(P), dist=Math.hypot(q[0],q[1],q[2]), Ra=R*air;
        if(dist<R*1.002) return null;                               /* (inside it: never, the flights go round) */
        const r=api.F*R/Math.max(1e-3,Math.sqrt(Math.max(1e-6,dist*dist-R*R)));   /* its true size on the screen */
        const view={q,dist,r,d:q[2]};
        if(q[2]>Ra*1.4){
          const x=api.W/2+q[0]*api.F/q[2], y=api.H/2+q[1]*api.F/q[2], h=api.F*Ra/(q[2]-Ra)*1.02;
          if(x+h<0||y+h<0||x-h>api.W||y-h>api.H) return null;
          return Object.assign(view,{x,y,h});
        }
        if(q[2]<-Ra) return null;                                   /* all of it behind the camera */
        return Object.assign(view,{x:api.W/2,y:api.H/2,h:Math.max(api.W,api.H),full:true});
      };
      const place=(u,v,R)=>{ const V=api.view(); set(u,"uCen",v.q[0],v.q[1],v.q[2]); set(u,"uRad",R); set(u,"uView",V[0],V[1],V[2],V[3]); };
      /* a picture that arrives while the ball is on screen fades in over what was there (never a jump) */
      const now=performance.now(), mix=k=>Math.min(1,Math.max(0,(now-k)/1200));
      const drawEarth=e=>{
        const td=api.image(IMG("earth-day.jpg")), ta=api.image(IMG("earth-aux.jpg")), real=!!(td&&ta);
        if(real&&!swap.earth) swap.earth=swap.earthSeen?now:-1e9;      /* (ready before it was ever seen: nothing to fade) */
        swap.earthSeen=true;
        const k=real?mix(swap.earth):0;
        const clouds=api.bake&&api.bake(CLOUD_FS,api.phone?1024:2048,api.phone?512:1024);
        const one=(tex,alpha)=>{
          const u=api.sprite(earth.prog.main,e.x,e.y,e.h,e.h,0);
          place(u,e,EARTH_R);
          set(u,"uL",.72,-.3,-.62); set(u,"uSpin",t*.05); set(u,"uT",t); set(u,"uA",alpha); set(u,"uS",3.7);
          if(tex){ api.bind(4,td); api.bind(5,ta); api.gl.uniform1i(u.uDay,4); api.gl.uniform1i(u.uAux,5); }
          if(clouds){ api.bind(6,clouds); api.gl.uniform1i(u.uCloud,6); }
          set(u,"uCl",clouds?1:0);
          set(u,"uTex",tex?1:0); set(u,"uLod",lodFor(e.r,2048));
          api.over(); api.draw();
        };
        if(real) one(true,a);
        if(k<1){ one(false,a*(1-k)); api.need(); }
      };
      const drawMoon=m=>{
        /* as it hangs in tonight's sky over Getafe: lit from where the Sun is (its phase, and which edge is
           bright), and turned as it stands in the sky (Astro.moonSky); up on the screen is up in the sky */
        /* (worked out once a second: it changes over minutes) */
        if(!swap.sky||now-swap.skyAt>1000){ swap.sky=typeof Astro!=="undefined"&&Astro.moonSky?Astro.moonSky(new Date(),40.305,-3.731):{inc:Math.PI/2,chi:-Math.PI/2,q:0}; swap.skyAt=now; }
        const sky=swap.sky;
        const w=sky.q-sky.chi, si=Math.sin(sky.inc);
        /* the sharper map on a computer (a phone keeps the lighter one); each one fades in over the last */
        const big=!api.phone&&api.image(IMG("moon-4k.jpg")), small=api.image(IMG("moon.jpg")), tm=big||small;
        if(tm!==swap.moonT){ swap.moonPrev=swap.moonT||null; swap.moonT=tm; swap.moon=swap.moonSeen?now:-1e9; }
        swap.moonSeen=true;
        const k=mix(swap.moon);
        const one=(tex,size,alpha)=>{
          const u=api.sprite(earth.prog.moon,m.x,m.y,m.h,m.h,0);
          place(u,m,MOON_R);
          set(u,"uL",Math.sin(w)*si,-Math.cos(w)*si,-Math.cos(sky.inc)); set(u,"uQ",sky.q); set(u,"uA",alpha); set(u,"uT",t);
          if(tex){ api.bind(4,tex); api.gl.uniform1i(u.uMoonT,4); }
          set(u,"uTex",tex?1:0); set(u,"uLod",lodFor(m.r,size));
          api.over(); api.draw();
        };
        one(tm,big?4096:2048,a);
        if(k<1&&swap.moon){ one(swap.moonPrev,2048,a*(1-k)); api.need(); }
      };
      /* the farther one first, so the nearer one covers it where they meet on the screen */
      const e=ball(EARTH_P,EARTH_R,1.14), m=ball(MOON_P,MOON_R,1.03);
      /* solid: the black hole is not traced through them */
      if(e&&!e.full) api.occlude(e.x,e.y,e.r,e.d);
      if(m&&!m.full) api.occlude(m.x,m.y,m.r,m.d);
      if(e&&m&&m.dist>e.dist){ drawMoon(m); drawEarth(e); }
      else { if(e) drawEarth(e); if(m) drawMoon(m); }
    }};
  window.UNIVERSE_EXTRAS.push(earth);

  /* (tests and trying things out) */
  return {
    nova:(x,y,age=20)=>{ if(api0){ spawnNova(api0,performance.now()/1000,x,y); nova.t0-=age; api0.need(); return true; } return false; },
    state:()=>nova?{k:(performance.now()/1000-nova.t0)/NOVA_DUR,at:api0.onScreen(nova.p)}:null,
    list:()=>window.UNIVERSE_EXTRAS.map(x=>x.id)
  };
})();
