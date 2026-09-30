/* ==========================================================
   shaders.js — the programs of the graphics card that universe.js runs:
   GLSL source as text, nothing else (no state, no code that runs). Kept apart
   so a shader can be read and changed without scrolling through the engine.
   Each one says what it draws; universe.js says when and with what. Names:
   *_VS a vertex shader, *_FS a fragment (pixel) shader. HEAD, NOISE and
   ORBITS are pieces the others start with (and wonders.js too, via api).
   ========================================================== */
const UNIVERSE_SHADERS=(function(){
  const HEAD="#version 300 es\nprecision highp float;\nprecision highp int;\nprecision highp sampler3D;\n";
  const NOISE=`
float h12(vec2 p){ vec3 p3=fract(vec3(p.xyx)*.1031); p3+=dot(p3,p3.yzx+33.33); return fract((p3.x+p3.y)*p3.z); }
float vn(vec2 p){ vec2 i=floor(p), f=fract(p); vec2 u=f*f*(3.-2.*f);
  return mix(mix(h12(i),h12(i+vec2(1,0)),u.x),mix(h12(i+vec2(0,1)),h12(i+vec2(1,1)),u.x),u.y); }
float fbm(vec2 p,int oct){ float t=0.,a=.5,n=0.; for(int o=0;o<7;o++){ if(o>=oct) break; t+=a*vn(p); n+=a; a*=.5; p=p*2.03+vec2(17.3,-9.1);} return t/n; }
`;
  /* the orbits: ellipses whose shape (b/a) and angle change with their size */
  const ORBITS=`
uniform vec4 uEll;   /* core radius, b/a at the core's edge, b/a at the edge, twist */
uniform vec2 uPhi0;  /* the orbits' turn at the centre; and (if not 0) the scale of a logarithmic winding */
/* how far the orbits have turned at a: in step with a, or (uPhi0.y) slower and slower outwards, as real
   arms are (a logarithmic spiral keeps its pitch: arms wound in step with a close into circles at the rim) */
float phaseOf(float a){ return uPhi0.x+uEll.w*(uPhi0.y>0.?uPhi0.y*log(1.+a/uPhi0.y):a); }
float qOf(float a){
  return mix(1.,uEll.y,smoothstep(0.,uEll.x*1.6,a))+(uEll.z-uEll.y)*smoothstep(uEll.x,1.2,a);
}
vec2 ell(float a,float th){
  float q=qOf(a), ph=phaseOf(a);
  vec2 p=vec2(a*cos(th),a*q*sin(th)); float c=cos(ph), s=sin(ph);
  return vec2(c*p.x-s*p.y,s*p.x+c*p.y);
}
`;
  const FULL_VS=HEAD+`out vec2 vUv; void main(){ vec2 p=vec2(float((gl_VertexID<<1)&2),float(gl_VertexID&2)); vUv=p; gl_Position=vec4(p*2.-1.,0.,1.); }`;

  /* --- the map of a galaxy's disk: light of old stars, young stars, pink regions, dust ---
     For every point of the disk it finds the orbit that passes there, and how
     squeezed the orbits are (that is what makes the arms). Painted once. */
  const MAP_FS=HEAD+NOISE+ORBITS+`
in vec2 vUv; out vec4 o;
uniform float uB;
uniform vec4 uDisk;   /* h, h young, h dust, warp */
uniform vec4 uArm;    /* young k, pink c1, pink c2, dust k */
uniform vec4 uMisc;   /* patchiness, dust lag, -, seed */
uniform vec4 uRing;   /* radius, width, light, dust */
uniform vec4 uMax;
float gOf(float a,vec2 xy){
  float ph=phaseOf(a); float c=cos(ph), s=sin(ph);
  vec2 r=vec2(c*xy.x+s*xy.y,-s*xy.x+c*xy.y); float q=qOf(a);
  vec2 e=r/vec2(a,a*q); return dot(e,e);
}
float squeeze(float a,float th){
  float ea=.05, et=.12;                                 /* measured over a stretch: broad arms, not lines */
  vec2 dA=(ell(a+ea,th)-ell(max(a-ea,1e-4),th))/(2.*ea), dT=(ell(a,th+et)-ell(a,th-et))/(2.*et);
  return clamp(a/max(abs(dA.x*dT.y-dA.y*dT.x),1e-5),0.,5.);
}
void main(){
  vec2 p=(vUv*2.-1.)*uB;
  float sd=uMisc.w;
  vec2 wv=vec2(fbm(p*2.2+sd,4),fbm(p*2.2+sd+vec2(5.2,1.3),4))-.5;
  vec2 xy=p+wv*uDisk.w;                               /* arms that wobble a little, like real ones */
  float lo=.002, hi=3.;
  for(int i=0;i<26;i++){ float m=.5*(lo+hi); if(gOf(m,xy)>1.) lo=m; else hi=m; }
  float a=.5*(lo+hi);
  float ph=phaseOf(a); float cph=cos(ph), sph=sin(ph);
  vec2 r=vec2(cph*xy.x+sph*xy.y,-sph*xy.x+cph*xy.y);
  float q=qOf(a), th=atan(r.y/(a*q),r.x/a);
  float fadeArm=1.-smoothstep(.45,1.05,a);                 /* arms fade out towards the edge */
  float c=mix(1.,squeeze(a,th),fadeArm), cd=mix(1.,squeeze(a,th+uMisc.y),fadeArm);
  float edge=(1.-smoothstep(.8,1.3,a)), inner=smoothstep(uEll.x*.3,uEll.x*1.9,a);
  float floc=.55+.9*fbm(p*5.+sd+3.,4);
  float clump=pow(fbm(p*9.+sd+7.,4),1.4)*2.2;
  float knots=pow(fbm(p*21.+sd,3),3.)*7.;
  float gran=.25+2.2*pow(fbm(p*38.+sd+2.,3),2.2);        /* young stars come in clouds */
  float fil=1.-abs(fbm(p*6.+sd+19.,5)*2.-1.);           /* dust in filaments */
  float dn=(.25+1.2*fbm(p*7.+sd+11.,5))*(.35+1.3*pow(fil,3.));
  float old=exp(-a/uDisk.x)*mix(.55,1.15,smoothstep(.8,2.2,c))*mix(1.,floc,uMisc.x)*edge;
  float young=exp(-a/uDisk.y)*pow(max(c-.75,0.),uArm.x)*1.6*clump*gran*inner*edge;
  float hii=exp(-a/uDisk.y)*smoothstep(uArm.y,uArm.z,c)*knots*inner*edge;
  float dust=exp(-a/uDisk.z)*(.25+pow(max(cd-.7,0.),uArm.w)*1.4)*dn*smoothstep(uEll.x*.1,uEll.x*.9,a)*edge;
  float ring=exp(-pow((a-uRing.x)/max(uRing.y,1e-3),2.));
  /* a ring is knotty, not a smooth tube: clusters of young stars with gaps between them */
  float rk=pow(fbm(p*9.+sd+3.,4),2.)*1.5+.15*floc;
  old+=uRing.z*ring*rk*edge; dust+=uRing.w*ring*(.55+.6*dn)*edge;
  o=sqrt(clamp(vec4(old,young,hii,dust)/uMax,0.,1.));
}`;

  /* --- a galaxy's stars: each on its orbit, where it is at time uT --- */
  const PART_VS=HEAD+ORBITS+`
layout(location=0) in vec4 aP0;   /* a, starting angle, height (or flattening), kind */
layout(location=1) in vec4 aP1;   /* brightness, speed factor, inclination, node */
layout(location=2) in vec3 aOff;  /* globular clusters: place in the cluster · pink regions: size */
layout(location=3) in vec4 aCol;
uniform mat4 uVP; uniform mat3 uM; uniform vec3 uC; uniform vec3 uCamL;
uniform float uT, uPat, uSide, uFade, uR;
uniform vec4 uRot;    /* vmax, core, direction, neighbour step */
uniform vec4 uArmP;   /* young k, pink c1, pink c2, - */
uniform vec4 uLook;   /* px per world unit at depth 1, largest point, star gain, - */
out vec3 vCol; out float vI;
void main(){
  float a=aP0.x, kind=aP0.w, I=aP1.x, sizeW=0.;
  /* a disk star's height is fixed, so its side is known before its orbit: the other pass skips it at once */
  if(kind<2.5&&(aP0.z>=0.?1.:-1.)*(uCamL.z>=0.?1.:-1.)*uSide<0.){ gl_Position=vec4(2.,2.,2.,1.); gl_PointSize=0.; return; }
  float om=uRot.z*uRot.x*(1.-exp(-a/uRot.y))/max(a,.015)*aP1.y;
  float th=aP0.y+om*uT;
  vec3 pl;
  if(kind<2.5){
    vec2 p=ell(a,th);
    if(kind>.5){
      /* how squeezed the orbits are here: the arms */
      float sq=mix(1.,uRot.w/max(length(ell(a+uRot.w,th)-p),1e-4),1.-smoothstep(.45,1.05,a));   /* arms fade out towards the edge */
      if(kind<1.5){ I*=clamp(pow(max(sq-.75,0.),uArmP.x)*1.2,.015,3.);          /* young stars live in the arms */ sizeW=aOff.x; }
      else { I*=smoothstep(uArmP.y,uArmP.z,sq)*(.78+.22*sin(uT*.45+aP0.y*13.)); sizeW=aOff.x; }
    }
    float cp=cos(uPat), sp=sin(uPat);
    pl=vec3(cp*p.x-sp*p.y,sp*p.x+cp*p.y,aP0.z);
  } else {
    /* bulges, halos, globular clusters: circles in their own tilted planes */
    float ci=cos(aP1.z), si=sin(aP1.z), cn=cos(aP1.w), sn=sin(aP1.w);
    vec3 o3=vec3(a*cos(th),a*sin(th)*ci,a*sin(th)*si);
    pl=vec3(cn*o3.x-sn*o3.y,sn*o3.x+cn*o3.y,o3.z*aP0.z)+(kind>3.5?aOff:vec3(0.));
  }
  /* which side of the disk it is on, seen from the camera: the dust darkens only the far side */
  float side=(pl.z>=0.?1.:-1.)*(uCamL.z>=0.?1.:-1.);
  vec3 wp=uC+uM*pl;
  vec4 cp4=uVP*vec4(wp,1.);
  float depth=cp4.w;
  if(side*uSide<0.||depth<.3||I<=.001){ gl_Position=vec4(2.,2.,2.,1.); gl_PointSize=0.; return; }
  gl_Position=cp4;
  float px=uLook.x/depth;
  float s, peak;
  if(sizeW>0.){
    s=clamp(sizeW*uR*px,1.5,uLook.y);
    peak=I*.55*smoothstep(1.,3.,s);                            /* a glowing patch: same brightness at any distance */
  } else {
    float flux=I*uLook.z*(40./depth)*(40./depth);               /* a star: dimmer with distance */
    s=clamp(1.25+1.5*sqrt(flux),1.25,min(5.5,uLook.y));
    peak=flux*2.2/(s*s);
  }
  /* capped: close up a star's value could overflow the half-float picture on a phone's graphics card, and
     infinity times the dust in front (0) is NaN, which shows black (an edge-on disk, first of all) */
  gl_PointSize=s; vCol=aCol.rgb; vI=min(peak,120.)*uFade;
}`;
  const PART_FS=HEAD+`in vec3 vCol; in float vI; out vec4 o;
void main(){ vec2 d=gl_PointCoord*2.-1.; float r2=dot(d,d); if(r2>1.) discard; o=vec4(vCol*vI*exp(-r2*4.),0.); }`;

  /* --- a galaxy's soft light, dust and bulge: looked through, pixel by pixel ---
     back pass: the far half, dimmed by the dust, which also darkens everything behind;
     front pass: the near half, added on top */
  const VOL_FS=HEAD+NOISE+`
in vec2 vUv; out vec4 o;
uniform sampler2D uMap; uniform vec4 uMax; uniform float uB;
uniform vec3 uCamL; uniform mat3 uRot;
uniform vec2 uCss; uniform vec2 uRes; uniform float uScale; uniform float uF;
uniform float uPat, uSide, uFade, uFrame, uSeed; uniform vec2 uSteps;
uniform highp sampler3D uN4, uN8, uN16;   /* 3D clouds: the three grids of random values, made once */
uniform vec3 uNz;         /* grid offset, low end, 1/range */
/* one layer: the grid blended smoothly (s-curve) by the texture unit itself, sampling
   between two grid values at the eased position: one read, not eight */
float layer(highp sampler3D s,float c,vec3 q){
  vec3 u=(q-uNz.x)*c, i=floor(u), f=fract(u);
  return textureLod(s,(i+f*f*(3.-2.*f)+.5)/c,0.).r;
}
float clouds(vec3 q){ return clamp((layer(uN4,4.,q)+.5*layer(uN8,8.,q)+.25*layer(uN16,16.,q)-uNz.y)*uNz.z,0.,1.); }
uniform vec2 uHalo;       /* stellar halo: brightness, size */
uniform vec4 uZ;          /* thickness, has a disk, dust strength, disk gain */
uniform vec3 uCOld, uCYoung, uCHii, uCCore;
uniform vec4 uBul;        /* brightness, size, profile, reach */
uniform vec3 uBQ;
uniform vec2 uGains;      /* young, pink */
uniform vec2 uDust;       /* -, dust thickness */
uniform float uTexel, uPix; /* size of a map texel (disk units), of a pixel (radians) */
/* the map at a point of the disk; lod: how blurred, from the size of a pixel there
   (given by hand: inside branches and loops the graphics card cannot work it out) */
vec2 pat;                 /* cos and sin of the pattern's turn: once per pixel, not per sample */
vec4 mapAt(vec2 xy,float foot){
  vec2 p=vec2(pat.x*xy.x+pat.y*xy.y,-pat.y*xy.x+pat.x*xy.y);
  vec2 uv=p/(2.*uB)+.5;
  if(uv.x<0.||uv.y<0.||uv.x>1.||uv.y>1.) return vec4(0.);
  /* faded out round the edge of the map, so a blurred map never shows its square border (a straight edge in the sky) */
  float edge=1.-smoothstep(.84,.98,length(p)/uB);
  vec4 m=textureLod(uMap,uv,max(0.,log2(foot/uTexel))); return m*m*uMax*edge;
}
void main(){
  vec2 fc=vec2(gl_FragCoord.x,uRes.y-gl_FragCoord.y)/uScale;
  vec3 dw=normalize(vec3((fc.x-uCss.x*.5)/uF,(fc.y-uCss.y*.5)/uF,1.));
  vec3 rd=normalize(uRot*dw), ro=uCamL;
  float camSide=ro.z>=0.?1.:-1.;
  float jit=h12(gl_FragCoord.xy);                 /* a fixed dither: no flicker */
  vec3 col=vec3(0.); float T=1.;
  float Tb=1.;                                     /* what this half's dust lets through */
  pat=vec2(cos(uPat),sin(uPat));
  if(uZ.y>.5){
    /* the disk is a real volume: old stars in a thick layer that flares towards the edge,
       young stars and pink regions in a thinner one, and dust in clouds with a 3D shape
       (they rise out of the middle plane and dip into it). The ray walks through this
       half of it, front to back; the samples crowd where the ray is nearest the middle
       plane, where the light and the dust are. */
    float hz=uZ.x, hd=uDust.y, mu=abs(rd.z), Hs=hz*9.;
    float sg=camSide*uSide;                               /* this half: z has this sign */
    float zlo=sg>0.?0.:-Hs, zhi=sg>0.?Hs:0.;
    vec3 inv=1./mix(rd,vec3(1e-6),lessThan(abs(rd),vec3(1e-6)));   /* never 1/0 along the disk */
    vec3 t0s=(vec3(-uB,-uB,zlo)-ro)*inv, t1s=(vec3(uB,uB,zhi)-ro)*inv;
    vec3 tn=min(t0s,t1s), tx=max(t0s,t1s);
    float ta=max(max(tn.x,tn.y),max(tn.z,0.)), tb=min(min(tx.x,tx.y),tx.z);
    if(tb>ta){
      float denseB=abs(ro.z+rd.z*tb)<abs(ro.z+rd.z*ta)?1.:0.;
      float steep=smoothstep(.08,.45,mu), pw=mix(1.,2.2,steep);
      int N=int(mix(uSteps.y,uSteps.x,steep)+.5);
      float L=tb-ta; vec3 T=vec3(1.), acc=vec3(0.);
      /* the samples' spacing, u → s: s0 is the previous step's s1, so each step needs two powers, not three */
      float fN=float(N), s1=0.;
      for(int i=0;i<48;i++){ if(i>=N) break;
        float u1=float(i+1)/fN, um=(float(i)+jit)/fN;
        float s0=s1;
        s1=denseB>.5?1.-pow(1.-u1,pw):pow(u1,pw);
        float sm=denseB>.5?1.-pow(1.-um,pw):pow(um,pw);
        float t=ta+L*sm, dt=L*(s1-s0);
        vec3 p=ro+rd*t;
        float r=length(p.xy), fl=1.+.9*r;
        vec4 m=mapAt(p.xy,max(t*uPix,dt*.3)+abs(p.z)*.35);        /* softer away from the middle */
        if(m.r+m.g+m.b+m.a<1e-4) continue;
        vec3 q=p*vec3(3.,3.,7.)+uSeed;
        float n1=clouds(q), n2=clouds(q*2.63+vec3(.31,.17,.53));
        float n=n1*.62+n2*.38;
        float hy=hz*.28*(1.+.4*r);
        /* the three layers' profiles, 1/cosh²(z/h) = 4e/(1+e)² with e=exp(-2|z|/h): one exponential each */
        vec3 ez=exp(-2.*abs(p.z)/vec3(hz*fl,hy,hd*fl)), sech2=4.*ez/((1.+ez)*(1.+ez));
        float so=sech2.x/(2.*hz*fl), sy=sech2.y/(2.*hy), sd=sech2.z/(2.*hd*fl);
        vec3 em=(m.r*uCOld*so*(.72+.56*n2)+(m.g*uGains.x*uCYoung+m.b*uGains.y*uCHii)*sy*(.3+1.4*n1))*uZ.w;
        /* dust: clouds (brownish at their thin edges: blue light is dimmed a little more) */
        float k=m.a*uZ.z*sd*(.12+2.4*n*n);
        vec3 a=k*dt*vec3(.82,1.,1.22), tr=exp(-a);
        acc+=T*em*dt*mix(vec3(1.),(1.-tr)/max(a,vec3(1e-5)),step(1e-4,a.g));
        T*=tr;
        if(T.g<.004) break;
      }
      col+=acc; Tb=T.g;
    }
  }
  /* the bulge: a real 3D glow, brightest at the centre; the samples crowd around the point
     of the ray nearest the centre, where the light is */
  float R=max(uBul.w,uHalo.x>0.?uHalo.y*4.:0.), b=dot(ro,rd), cc=dot(ro,ro)-R*R, disc=b*b-cc;
  if(disc>0.){
    float sq=sqrt(disc), t0=max(-b-sq,0.), t1=-b+sq;
    if(t1>t0){
      float tm=clamp(-b,t0,t1), bn=2.*uBul.z-.327, acc=0., hal=0.;
      for(int h=0;h<2;h++){
        float L=h==0?tm-t0:t1-tm, sgn=h==0?-1.:1.;
        for(int i=0;i<10;i++){
          float u0=float(i)/10., u1=float(i+1)/10., um=(float(i)+.25+.5*jit)/10.;
          vec3 p=ro+rd*(tm+sgn*L*um*um);
          if((p.z>=0.?1.:-1.)*camSide*uSide<0.) continue;
          float w=L*(u1*u1-u0*u0);
          float rb=length(p/uBQ)/uBul.y;
          if(rb<12.) acc+=exp(-bn*(pow(rb+.001,1./uBul.z)-1.))*w;
          /* the stellar halo: a faint round glow around the whole galaxy, so it sits in
             space instead of looking cut out */
          /* (fading to nothing before the sphere it is walked in ends: a cut there showed as a see-through circle) */
          float hr=length(p*vec3(1.,1.,1.3))/uHalo.y;
          hal+=exp(-hr)*(1.-smoothstep(1.8,3.6,hr))*w;
        }
      }
      col+=(uCCore*uBul.x*acc+uCOld*uHalo.x*hal)*(uSide<0.?Tb:1.);
    }
  }
  /* always finite (see the stars), and never quite opaque: a phone's half-float picture can hold infinity where
     hundreds of bright core stars pile up, and infinity times an opacity of exactly 1 (0 let through) is NaN,
     which showed as black dots in the edge-on galaxy's dust */
  o=vec4(clamp(col,0.,3e3),clamp(1.-Tb,0.,.985))*uFade;
}`;

  /* --- far stars: fixed on the sky (infinitely far), a few twinkle slowly --- */
  const FAR_VS=HEAD+`
layout(location=0) in vec4 aS;   /* direction, brightness */
layout(location=1) in vec4 aCol; /* colour, twinkles */
uniform mat4 uVP; uniform float uT, uScale, uFade;
out vec3 vCol; out float vI;
void main(){
  vec4 c=uVP*vec4(aS.xyz,0.);
  if(c.w<=0.){ gl_Position=vec4(2.,2.,2.,1.); gl_PointSize=0.; return; }
  gl_Position=c;
  float m=aS.w, tw=1.;
  if(aCol.a>.5) tw=.62+.38*sin(uT*(.35+fract(aS.x*97.)*.6)+aS.y*300.);
  gl_PointSize=(1.15+2.4*m*m)*uScale;
  vCol=aCol.rgb; vI=(.1+1.9*m*m*m)*tw*uFade;
}`;
  const DOT_FS=HEAD+`in vec3 vCol; in float vI; out vec4 o;
void main(){ vec2 d=gl_PointCoord*2.-1.; float r2=dot(d,d); if(r2>1.) discard; o=vec4(vCol*vI*exp(-r2*4.5),0.); }`;

  /* --- the nebula: painted once --- */
  const NEBGEN_FS=HEAD+NOISE+`
in vec2 vUv; out vec4 o; uniform vec2 uAsp;
void main(){
  vec2 q0=vUv*uAsp*2.2;
  float qx=fbm(q0+vec2(1.7,9.2),4), qy=fbm(q0+vec2(8.3,2.8),4);
  float gas=fbm(q0+2.2*vec2(qx,qy),6);
  float ridge=1.-abs(fbm(q0*1.6+vec2(qx,qy)+3.1,5)*2.-1.);
  float dust=pow(fbm(q0*2.4+vec2(4.,-3.),5),2.2);
  float e=max(0.,gas-.4)*2.6*(1.-min(.9,dust*1.4)), fil=pow(ridge,5.)*.9*max(0.,gas-.28);
  float k=clamp((qx-.3)*1.8,0.,1.);
  vec3 c=mix(vec3(.27,.16,.37),vec3(.47,.18,.24),k)*e+vec3(.63,.55,.47)*fil;
  o=vec4(c,1.);
}`;
  /* --- the band of our own galaxy across the sky (like the Milky Way on a dark night): painted
     once. Star clouds, a brighter heart, winding lanes and dark globules of dust, pink knots of
     gas, and faint wisps reaching out of its edges; the nebulae of wonders.js sit inside it,
     the galaxies around it, as in the real sky. rgb: its light; a: how much its dust hides
     what lies behind (drawn separately, so the far stars disappear into the dark lanes) */
  const BANDGEN_FS=HEAD+NOISE+`
in vec2 vUv; out vec4 o;
uniform vec2 uHalf;       /* the picture's half size, in shares of half the screen */
uniform vec4 uCurve;      /* its middle line: a + b·t + c·t², and whether t runs down (0) or across (1) */
uniform vec3 uBand;       /* its half width, where its heart is (along it), the screen's width/height */
void main(){
  vec2 f=(vUv*2.-1.)*uHalf; float asp=uBand.z, s, d;
  if(uCurve.w<.5){ float xc=uCurve.x+uCurve.y*f.y+uCurve.z*f.y*f.y, sl=(uCurve.y+2.*uCurve.z*f.y)*asp; d=(f.x-xc)*asp/sqrt(1.+sl*sl); s=f.y; }
  else { float yc=uCurve.x+uCurve.y*f.x+uCurve.z*f.x*f.x, sl=(uCurve.y+2.*uCurve.z*f.x)/asp; d=(f.y-yc)/sqrt(1.+sl*sl); s=f.x*asp; }
  float w=uBand.x*(1.+.22*sin(s*1.7+1.)+.12*sin(s*4.3+2.));      /* it swells and narrows */
  float u=d/w;
  vec2 warp=vec2(fbm(vec2(s*1.6,u*.8)+vec2(3.1,7.7),4),fbm(vec2(s*1.6,u*.8)+vec2(8.4,1.9),4))-.5;
  vec2 bq=vec2(s*3.,u*1.5)+warp*1.6;
  /* star clouds: the light comes in clumps, strongest along the middle */
  float clouds=fbm(bq+vec2(0.,uCurve.x*9.),6), fine=fbm(bq*4.,4);
  float core=exp(-u*u*2.), outer=exp(-u*u*.35);
  float glow=core*(.1+2.2*pow(clouds,3.))*(.75+.5*fine)+outer*.07*(.5+clouds);
  float sh=s-uBand.y; float heart=exp(-sh*sh*2.2)*exp(-u*u*1.1)*(.6+.8*clouds);   /* its bright heart */
  /* dust: lanes winding along the middle (the "great rift"), clouds and small dark globules */
  float rid=1.-abs(fbm(vec2(s*2.2,u*2.6)+warp*1.3+11.,5)*2.-1.);
  float lane=pow(rid,5.)*exp(-pow((u-.2*sin(s*2.1+.5))/.45,2.))*smoothstep(.3,.6,fbm(vec2(s*1.3,3.),3));
  float blot=smoothstep(.62,.8,fbm(vec2(s*4.,u*2.6)+warp*1.5+5.,5))*core;
  float dust=clamp(lane*.85+blot*.35,0.,.85);
  /* wisps of dust and gas reaching out from its edges, faintly lit */
  float ten=pow(1.-abs(fbm(vec2(s*9.+warp.x*2.,u*.9)+2.,5)*2.-1.),9.)*exp(-u*u*.45)*smoothstep(.5,1.1,abs(u));
  /* pink knots of glowing gas, and blue haze here and there */
  float hii=smoothstep(.7,.88,fbm(vec2(s*7.,u*4.)+19.,4))*core;
  float blue=smoothstep(.6,.85,fbm(vec2(s*3.,u*2.)+41.,4))*outer*(1.-core*.5);
  vec3 warm=vec3(1.,.83,.64), cool=vec3(.62,.66,1.);
  vec3 L=mix(warm,cool,smoothstep(.3,1.4,abs(u)))*glow+vec3(1.,.78,.52)*heart*1.3
        +vec3(.7,.58,.66)*ten*.12+vec3(1.,.3,.5)*hii*.9+vec3(.35,.5,1.)*blue*.25;
  /* it is made of stars: countless faint ones, one texel each, thickest where it glows */
  float dens=clamp(glow*1.1+heart*.7+outer*.03,0.,1.);
  vec2 g=gl_FragCoord.xy; float h=h12(g*1.37+.5), h2=h12(g*.71+9.3);
  float grain=step(1.-dens*.3,h)*(.12+1.2*pow(h2,4.));
  vec3 sc=mix(vec3(1.,.8,.6),vec3(.75,.85,1.),step(.6,h2));
  L=L*.7+sc*grain*.9;
  L*=1.-dust*.9;
  /* it thins away before the picture's edge, so flying to a sight never shows where it ends */
  vec2 ef=abs(f)/uHalf; float endf=(1.-smoothstep(.62,.97,ef.x))*(1.-smoothstep(.62,.97,ef.y));
  o=vec4(L*.5,dust)*endf;
}`;
  const DUST_FS=HEAD+`in vec2 vUv; out vec4 o; uniform sampler2D uTex; uniform float uGain;
void main(){ vec2 e=min(vUv,1.-vUv); float f=smoothstep(0.,.1,min(e.x,e.y)); o=vec4(0.,0.,0.,texture(uTex,vUv).a*uGain*f); }`;
  const NEB_VS=HEAD+`uniform mat4 uVP; uniform vec4 uQuad; out vec2 vUv;
void main(){ vec2 c=vec2(float(gl_VertexID&1),float(gl_VertexID>>1)); vUv=c; gl_Position=uVP*vec4(uQuad.xy+(c*2.-1.)*uQuad.zw,1400.,1.); }`;
  const NEB_FS=HEAD+`in vec2 vUv; out vec4 o; uniform sampler2D uTex; uniform float uGain;
void main(){ vec2 e=min(vUv,1.-vUv); float f=smoothstep(0.,.08,min(e.x,e.y)); o=vec4(texture(uTex,vUv).rgb*uGain*f,0.); }`;

  /* --- tiny far galaxies: each drawn from a formula, no pictures --- */
  const DEEP_VS=HEAD+`
layout(location=0) in vec4 aPos;  /* centre, size */
layout(location=1) in vec4 aPar;  /* tilt, roll, type, seed */
layout(location=2) in vec4 aCol;
uniform mat4 uVP; uniform vec2 uCss; uniform float uF, uFade;
out vec2 vUv; out vec4 vPar; out vec3 vCol; out float vI;
void main(){
  vec2 c=vec2(float(gl_VertexID&1),float(gl_VertexID>>1))*2.-1.;
  vec4 p=uVP*vec4(aPos.xyz,1.);
  float px=aPos.w*uF/max(p.w,1.);
  if(p.w<1.||px<.8){ gl_Position=vec4(2.,2.,2.,1.); return; }
  p.xy+=c*aPos.w*vec2(2.*uF/uCss.x,2.*uF/uCss.y);
  gl_Position=p; vUv=c; vPar=aPar; vCol=aCol.rgb; vI=aCol.a*uFade*smoothstep(.8,4.,px);
}`;
  const DEEP_FS=HEAD+`
in vec2 vUv; in vec4 vPar; in vec3 vCol; in float vI; out vec4 o;
void main(){
  float cr=cos(-vPar.y), sr=sin(-vPar.y);
  vec2 ab=vec2(vUv.x*cr-vUv.y*sr,vUv.x*sr+vUv.y*cr);
  float ci=max(cos(vPar.x),.07);
  vec2 X=vec2(ab.x,ab.y/ci); float r=length(X), th=atan(X.y,X.x);
  float core=exp(-7.*sqrt(length(vec2(ab.x,ab.y/.85))/.16+.001))*3.;
  float disk=0.;
  if(vPar.z<.5) disk=exp(-r/.26)*(.45+.55*pow(.5+.5*cos(2.*(th-log(r+.04)/.33)+vPar.w*6.28),2.));
  else if(vPar.z<1.5) core=exp(-5.*pow(length(vec2(ab.x,ab.y/.8))/.5+.001,.4))*2.2;
  else disk=exp(-r/.3)*exp(-abs(ab.y)/.035)*(1.-.8*exp(-pow(ab.y/.012,2.)));
  float f=(1.-smoothstep(.6,1.,length(vUv)));
  vec3 c=vec3(1.,.86,.66)*core+vCol*disk;
  o=vec4(c*vI*f,0.);
}`;

  /* --- stars scattered through space: round at rest, streaks while the camera flies --- */
  const FIELD_VS=HEAD+`
layout(location=0) in vec4 aS;   /* position, brightness */
uniform mat4 uVP, uVPp; uniform vec2 uCss; uniform float uScale, uBoost, uFade;
out vec2 vQ; out float vLen, vW, vI;
void main(){
  vec4 c1=uVP*vec4(aS.xyz,1.), c0=uVPp*vec4(aS.xyz,1.);
  if(c1.w<1.||c0.w<1.){ gl_Position=vec4(2.,2.,2.,1.); return; }
  vec2 s1=c1.xy/c1.w*.5*uCss*uScale, s0=c0.xy/c0.w*.5*uCss*uScale;
  vec2 d=s1-s0; float len=min(length(d),240.*uScale);
  vec2 dir=len>.01?normalize(d):vec2(1.,0.), nrm=vec2(-dir.y,dir.x);
  s0=s1-dir*len;
  float w=(1.+min(1.2,18./c1.w))*uScale;
  int id=gl_VertexID;
  float along=(id&1)==0?-1.:1., across=id<2?-1.:1.;
  vec2 p=(along<0.?s0-dir*w:s1+dir*w)+nrm*across*w;
  gl_Position=vec4(p/(.5*uCss*uScale),0.,1.);
  vQ=vec2(along<0.?-w:len+w,across*w); vLen=len; vW=w;
  vI=aS.w*min(1.,60./c1.w)*(.35+uBoost)*uFade/(1.+len/(3.*uScale));
}`;
  const FIELD_FS=HEAD+`in vec2 vQ; in float vLen, vW, vI; out vec4 o;
void main(){ float u=vQ.x, v=vQ.y; float d=length(vec2(max(0.,max(-u,u-vLen)),v))/vW; o=vec4(vec3(.9,.93,1.)*vI*exp(-d*d*3.2),0.); }`;

  /* --- shooting stars and comets: drawn on the screen, over everything --- */
  const MET_VS=HEAD+`
layout(location=0) in vec4 aA;   /* start x,y (css px), speed x,y (px/s) */
layout(location=1) in vec4 aB;   /* start time, duration, tail length, brightness */
uniform float uNow; uniform vec2 uCss;
out vec2 vQ; out float vLen, vI, vG, vSeed, vK;
void main(){
  float age=uNow-aB.x, k=age/aB.y;
  if(age<0.||k>1.){ gl_Position=vec4(2.,2.,2.,1.); return; }
  /* it lights up fast, burns, flares a little and dies away */
  float env=smoothstep(0.,.22,k)*(1.-smoothstep(.58,1.,k))*(1.+.3*exp(-pow((k-.5)/.09,2.)));
  vec2 v=aA.zw, dir=normalize(v), nrm=vec2(-dir.y,dir.x), head=aA.xy+v*age;
  /* the tail grows as it enters the air and stays behind the head */
  float len=aB.z*(.25+.75*smoothstep(0.,.3,k)), G=14.+10.*aB.w;
  int id=gl_VertexID; float along=(id&1)==0?-1.:1., across=id<2?-1.:1.;
  vec2 p=(along<0.?head-dir*(len+4.):head+dir*G)+nrm*across*G;
  gl_Position=vec4(p.x/uCss.x*2.-1.,1.-p.y/uCss.y*2.,0.,1.);
  vQ=vec2(along<0.?-4.:len+G,across*G); vLen=len; vI=aB.w*env; vG=G; vSeed=fract(aB.x*.618); vK=k;
}`;
  /* a shooting star: a hot head with a soft halo, and a tapering tail that cools
     from blue-white to orange, with a faint glow around it and a slight flicker */
  const MET_FS=HEAD+NOISE+`in vec2 vQ; in float vLen, vI, vG, vSeed, vK; out vec4 o;
void main(){
  float u=vQ.x, v=vQ.y, s=clamp(u/vLen,0.,1.);
  float inTail=smoothstep(-3.,2.,u)*(1.-smoothstep(vLen-1.,vLen+1.5,u));
  float wc=mix(.3,2.,pow(s,1.3));                             /* thinner towards the end */
  float fl=.7+.3*vn(vec2(u*.08-vK*16.,vSeed*40.));            /* bits of it burn brighter */
  float core=exp(-v*v/(wc*wc))*pow(s,1.6)*fl;
  float wg=wc*3.2+2.;
  float glow=exp(-v*v/(wg*wg))*pow(s,2.)*.42*fl;
  float r=length(vec2(u-vLen,v));
  float head=exp(-r*r/4.)*2.4+exp(-r/4.5)*.75+exp(-r*r/(vG*vG*.35))*.16;
  /* hot and blue-green at the head, cooling to orange and red along the tail */
  vec3 tc=mix(vec3(1.,.42,.22),vec3(.62,.86,1.),smoothstep(.1,.8,s));
  vec3 gc=mix(vec3(.9,.3,.35),vec3(.35,.8,.95),smoothstep(.2,.9,s));
  vec3 c=(tc*core*1.6+gc*glow)*inTail+vec3(.82,1.,.9)*head;
  o=vec4(c*vI,0.);
}`;
  /* a comet: its kind (see COMET_KINDS) comes in as colours and strengths. One head, or a few
     pieces of a comet breaking up, each with its coma and tails; some kinds also show a thin
     anti-tail pointing ahead */
  const COMET_VS=HEAD+`uniform vec2 uCss; uniform vec2 uHead, uDir; uniform vec2 uSize; out vec2 vQ;
void main(){
  vec2 c=vec2(float(gl_VertexID&1),float(gl_VertexID>>1));
  vec2 nrm=vec2(-uDir.y,uDir.x);
  float u=mix(-.4,1.,c.x)*uSize.x, v=(c.y*2.-1.)*uSize.y;
  vec2 p=uHead+uDir*u+nrm*v;
  gl_Position=vec4(p.x/uCss.x*2.-1.,1.-p.y/uCss.y*2.,0.,1.);
  vQ=vec2(u,v);
}`;
  const COMET_FS=HEAD+NOISE+`in vec2 vQ; out vec4 o; uniform vec2 uSize; uniform float uA, uSeed, uNow, uAge;
uniform vec3 uComa, uDustC, uIonC;
uniform vec4 uK;          /* dust tail, ion tail, how much the dust tail curves, how wide it fans */
uniform vec4 uK2;         /* anti-tail, pieces (1-3), coma size, ion streamers */
vec3 one(vec2 q,float L,float sd){
  float u=q.x, v=q.y, un=max(u,0.)/L, r=length(q);
  /* the head: a tiny bright nucleus inside its coma and a wide faint halo */
  float rc=L*.022*uK2.z;
  /* a tiny nucleus in a soft coma that breathes a little, and a wide faint halo */
  float fl=.9+.1*sin(uAge*2.1+sd)*sin(uAge*.63+sd*2.);
  float coma=(exp(-r*r/(rc*rc*.025))*2.4+exp(-r*r/(rc*rc*1.3))*.75*fl+exp(-r/(rc*3.))*.3*(1.-smoothstep(L*.12,L*.24,r)));
  float end=1.-smoothstep(.5,1.,un), grow=smoothstep(0.,.05,u/L);
  /* dust tail: curved, brighter on its outer edge, with faint rays */
  float bend=uK.z*L*un*un, wd=L*(.012+uK.w*1.5*un*(1.+.8*un));
  float x=(v-bend)/wd;
  float fan=exp(-x*x)*(.75+.35*smoothstep(-1.,1.,x));
  float rays=.82+.18*fbm(vec2(v/max(u,L*.02)*7.+sd,un*2.-uNow*.02),3);
  float bands=.94+.06*sin(un*30.-x*1.5+sd*5.+uAge*.2);     /* very faint striations across the dust */
  /* the dust spreads as it goes, so it dims faster than it fades: brightest just behind the head */
  float dustT=fan*mix(1.,rays,smoothstep(.05,.3,un))*bands*exp(-un*2.6)*sqrt(L*.02/wd)*grow*end;
  /* ion tail: narrow, straight, streaming away; some kinds split it into streamers */
  float wi=L*(.005+.018*un);
  /* soft knots drift out along it (the solar wind), and some kinds show faint parallel streamers */
  float streak=.7+.3*fbm(vec2(un*7.-uAge*.25,v/wi*.35+sd),3);
  float strands=mix(1.,.6+.6*fbm(vec2(v/wi*.9+sd,un*1.5-uNow*.02),3),uK2.w);
  float ionT=(exp(-v*v/(wi*wi*(1.+uK2.w*3.)))*.75+exp(-v*v/(wi*wi*10.))*.2)*exp(-un*1.6)*streak*strands*grow*end;
  /* anti-tail: a thin spike of dust seen edge-on, pointing ahead */
  float ua=max(-u,0.)/L;
  float anti=exp(-v*v/(L*L*.00003))*exp(-ua*6.)*smoothstep(0.,.02,ua)*0.;   /* (read as a tail going the wrong way: off) */
  return uComa*coma+uDustC*(dustT*uK.x+anti*uK2.x)+uIonC*ionT*uK.y;
}
void main(){
  float L=uSize.x;
  vec3 c=one(vQ,L,uSeed);
  /* a comet breaking up: smaller pieces trailing behind, a little off the line */
  for(int i=1;i<3;i++){
    if(float(i)>=uK2.y) break;
    c+=one(vQ-vec2(L*.08*float(i),L*.014*(i==1?1.:-.8)),L*.5,uSeed+float(i)*3.7)*(.55-.12*float(i));
  }
  o=vec4(c*uA,0.);
}`;

  /* --- the black hole from afar: while it is only a few pixels across it cannot be traced (the trace lies
     over everything), so it is drawn in its place among the galaxies instead, as it looks from far away:
     its tilted pink disk, brighter on the side coming at us, its shadow and the thin ring of light round
     it. It hands over smoothly to the traced one as the camera comes closer --- */
  const HOLE_FS=HEAD+`in vec2 vQ; out vec4 o; uniform float uA, uTilt, uS;
void main(){
  vec2 p=vQ*uS; float r=length(p);                                /* in the shadow's radii */
  float e=length(vec2(p.x/max(uTilt,.12),p.y));                    /* on the plane of the disk */
  float disk=smoothstep(1.15,1.6,e)*exp(-(e-1.4)*.8)*(1.-smoothstep(2.8,4.,e));
  float dop=1.+.7*clamp(p.y/(e+1e-3),-1.,1.);
  vec3 col=mix(vec3(.85,.16,.78),vec3(1.,.84,.93),exp(-(e-1.3)*.9))*disk*dop*1.5;
  float front=step(0.,p.x);                                        /* the near half of the disk passes in front of the shadow */
  float shadow=(1.-smoothstep(.92,1.04,r));
  col=col*(1.-shadow*(1.-front*.85))+vec3(1.,.72,.92)*exp(-pow((r-1.06)/.07,2.))*.9;
  col+=vec3(1.,.38,.82)*.08*exp(-max(r-1.,0.)*.8);
  float edge=1.-smoothstep(.75,1.,length(vQ));
  o=vec4(col*uA*edge,shadow*(1.-front*.85*disk)*uA*.96);
}`;

  /* --- the glow around bright things, and developing the picture --- */
  const BRIGHT_FS=HEAD+`in vec2 vUv; out vec4 o; uniform sampler2D uTex; uniform vec2 uTexel; uniform float uThr;
void main(){ vec3 c=vec3(0.);
  c+=texture(uTex,vUv+uTexel*vec2(-1.,-1.)).rgb; c+=texture(uTex,vUv+uTexel*vec2(1.,-1.)).rgb;
  c+=texture(uTex,vUv+uTexel*vec2(-1.,1.)).rgb; c+=texture(uTex,vUv+uTexel*vec2(1.,1.)).rgb;
  c*=.25; if(any(isnan(c))||any(isinf(c))) c=vec3(0.);   /* (a broken pixel must not spread through the glow) */
  o=vec4(max(c-uThr,0.),1.); }`;
  const BLUR_FS=HEAD+`in vec2 vUv; out vec4 o; uniform sampler2D uTex; uniform vec2 uStep;
void main(){ vec3 c=texture(uTex,vUv).rgb*.227;
  c+=(texture(uTex,vUv+uStep*1.385).rgb+texture(uTex,vUv-uStep*1.385).rgb)*.316;
  c+=(texture(uTex,vUv+uStep*3.231).rgb+texture(uTex,vUv-uStep*3.231).rgb)*.07;
  o=vec4(c,1.); }`;
  /* a galaxy's volume, drawn at a lower resolution, spread over the full picture (it is soft light and dust) */
  /* It filters by itself (blending the four nearest texels, read exactly), never trusting the graphics card to
     blend a half-float picture: some phones cannot, and then every texel of the volume showed as a hard square
     (a staircase of black blocks along an edge-on galaxy's dust ring). Four reads: light enough for a phone */
  /* the edge-on galaxy on a phone: its light and dust as pictures (img/edgeon-light.jpg, img/edgeon-dust.jpg),
     worked out once with the full volume at a computer's best (twice the steps, the whole resolution) and
     drawn here as a card that faces the camera. A phone never walks that volume: whatever its graphics
     card does with half floats, noise or precision, this galaxy cannot come out in stairs or sheets.
     light: √(c/(1+c)) per channel (c: the light, already dimmed by its own dust) · dust: how much of what is
     behind it hides (0..1). The stars of the galaxy are still its own 3D points, in front and behind. */
  const CARD_FS=HEAD+`in vec2 vQ; out vec4 o; uniform sampler2D uLight, uDust; uniform float uA;
void main(){
  vec2 uv=vQ*.5+.5;
  vec3 e=texture(uLight,uv).rgb, s=e*e;
  vec3 c=s/max(1.-s,vec3(.004));
  float a=texture(uDust,uv).r;
  o=vec4(c,clamp(a,0.,.985))*uA;
}`;
  const UP_FS=HEAD+`out vec4 o; uniform sampler2D uTex; uniform vec2 uK, uSize;
void main(){
  vec2 q=gl_FragCoord.xy*uK*uSize-.5, i=floor(q), f=q-i; ivec2 hi=ivec2(uSize)-1, b=ivec2(i);
  vec4 a=texelFetch(uTex,clamp(b,ivec2(0),hi),0), c=texelFetch(uTex,clamp(b+ivec2(1,0),ivec2(0),hi),0);
  vec4 d=texelFetch(uTex,clamp(b+ivec2(0,1),ivec2(0),hi),0), e=texelFetch(uTex,clamp(b+ivec2(1,1),ivec2(0),hi),0);
  o=max(mix(mix(a,c,f.x),mix(d,e,f.x),f.y),vec4(0.));
}`;
  /* the black hole lives here, in the last step, and it is traced, not painted: for every pixel
     near it, the ray of light is followed backwards along its real path in the curved space
     around the hole (Schwarzschild; the step is the one of Riccardo Antonelli's "Starless":
     a = −1.5·h²·p/|p|⁵, h the ray's angular momentum). Whatever that path meets is what the
     pixel shows: the hole (black), the thin disk of hot gas each time the ray crosses it, or
     the sky it finally escapes to. The shadow, the thin ring of light that went round it, the
     disk bent over the top and under the bottom, and the Einstein ring of the stars behind all
     come out of that by themselves. The gas is hotter inside (the thin disk's law), brighter
     and whiter on the side coming at us, dimmer and deeper on the side going away and deep
     in the hole's pull (Doppler and gravitational redshift); its colours run from pale pink
     through rose and magenta to violet, with bright pink knots in the outer disk.
     Units: the hole's own radius (the event horizon) is 1. */
  const COMP_FS=HEAD+NOISE+`in vec2 vUv; out vec4 o;
uniform sampler2D uHdr, uBloom; uniform float uExp, uBloomK, uTime, uOutK; uniform vec2 uRes;
uniform vec4 uBH;         /* the hole seen from the camera (x right, y up, z ahead; in its radii), strength (0: none) */
uniform vec4 uBHn;        /* the axis of its disk (same axes), time */
uniform float uFpx;       /* focal length in px of the picture */
uniform vec4 uOcc[2];     /* things in front of the hole (the Earth, the Moon): centre and radius in px of the picture, w: on */
/* the glow is a quarter-size half-float picture: blended here by hand (four exact reads), as in UP_FS, because
   the phones that cannot blend half floats showed it as a grid of 4×4 squares */
vec3 bloomAt(vec2 uv){
  ivec2 sz=textureSize(uBloom,0), hi=sz-1; vec2 q=uv*vec2(sz)-.5, i=floor(q), f=q-i; ivec2 b=ivec2(i);
  vec3 a=texelFetch(uBloom,clamp(b,ivec2(0),hi),0).rgb, c=texelFetch(uBloom,clamp(b+ivec2(1,0),ivec2(0),hi),0).rgb;
  vec3 d=texelFetch(uBloom,clamp(b+ivec2(0,1),ivec2(0),hi),0).rgb, e=texelFetch(uBloom,clamp(b+ivec2(1,1),ivec2(0),hi),0).rgb;
  return mix(mix(a,c,f.x),mix(d,e,f.x),f.y);
}
float h(vec2 p){ vec3 p3=fract(vec3(p.xyx)*.1031); p3+=dot(p3,p3.yzx+33.33); return fract((p3.x+p3.y)*p3.z); }
float h31(vec3 p){ p=fract(p*.1031); p+=dot(p,p.zyx+31.32); return fract((p.x+p.y)*p.z); }
float vn3(vec3 p){ vec3 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
  return mix(mix(mix(h31(i),h31(i+vec3(1,0,0)),f.x),mix(h31(i+vec3(0,1,0)),h31(i+vec3(1,1,0)),f.x),f.y),
             mix(mix(h31(i+vec3(0,0,1)),h31(i+vec3(1,0,1)),f.x),mix(h31(i+vec3(0,1,1)),h31(i+vec3(1,1,1)),f.x),f.y),f.z); }
float fbm3(vec3 p){ return (.5*vn3(p)+.25*vn3(p*2.07+3.1)+.125*vn3(p*4.13+7.7))/.875; }
/* colour of a black body at K kelvin (normalised) */
vec3 bb(float K){
  float t=K/100.;
  float r=t<=66.?1.:clamp(1.2929*pow(t-60.,-.1332),0.,1.);
  float g=t<=66.?clamp(.3900816*log(t)-.6318414,0.,1.):clamp(1.1298909*pow(t-60.,-.0755148),0.,1.);
  float b=t>=66.?1.:t<=19.?0.:clamp(.5432068*log(t-10.)-1.1962541,0.,1.);
  return vec3(r,g,b);
}
/* the gas at a point of the disk: its clumps and streaks turn with it. Three rings of pattern,
   each turning at the speed of its own orbits and blended by radius: the inside goes round
   faster than the outside, and the pattern never winds itself up (nor has to start over) */
float gas(float r,vec2 xy){
  float ph=atan(xy.y,xy.x), t=uBHn.w, n=0., wsum=0.;
  for(int k=0;k<3;k++){
    float rk=k==0?3.6:k==1?7.:13., w=exp(-pow((r-rk)/(k==0?1.8:k==1?3.:4.5),2.));
    float a=ph-t*1.6*pow(3./rk,1.5);                     /* Keplerian: faster inside */
    vec3 q=vec3(r*3.4,cos(a)*1.6,sin(a)*1.6)+float(k)*7.3;
    float fl=1.+.14*sin(t*(1.3-.3*float(k))+ph*2.+float(k)*2.1);                  /* the clumps flicker as they go */
    n+=w*fl*(fbm3(q)*.65+fbm3(vec3(r*11.,cos(a)*.9,sin(a)*.9)+float(k)*3.1)*.35);   /* clumps, and fine streaks along the orbits */
    wsum+=w;
  }
  n/=max(wsum,1e-3);
  /* a hot spot orbiting close in, flaring now and then (like the flares of our galaxy's own hole) */
  float hs=ph-t*1.6*pow(3./4.6,1.5), dr=r-4.6, da=atan(sin(hs),cos(hs));
  float flare=.5+.5*pow(.5+.5*sin(t*.23),6.);
  n+=exp(-dr*dr*1.4-da*da*9.)*.55*flare;
  return .25+1.6*n*n;
}
/* its colours: pale pink-white where it is hottest, then rose and magenta, and deep violet at
   the cool outer edge; the side coming at us (hotter to our eyes) turns almost white */
vec3 palette(float x){
  vec3 c=mix(vec3(.3,.34,1.),vec3(.5,.12,.92),smoothstep(.04,.2,x));      /* blue-violet at the cool edge */
  c=mix(c,vec3(.9,.14,.84),smoothstep(.16,.42,x));
  c=mix(c,vec3(1.,.3,.62),smoothstep(.38,.66,x));
  c=mix(c,vec3(1.,.8,.9),smoothstep(.66,.98,x));
  return mix(c,vec3(.96,.95,1.),smoothstep(1.,1.5,x));
}
/* bright pink knots scattered through the outer disk, turning with it */
float knots(float r,vec2 xy){
  float a=atan(xy.y,xy.x)-uBHn.w*1.6*pow(3./max(r,3.),1.5);
  float n=vn3(vec3(r*2.3,cos(a)*9.,sin(a)*9.));
  return pow(max(n-.62,0.)/.38,3.)*smoothstep(6.,11.,r);
}
void main(){
  vec2 uv=vUv; vec3 add=vec3(0.); float hole=0., bgT=1.;
  /* the hole is traced over everything: not where something nearer stands in front of it */
  float bhk=uBH.w;
  for(int i=0;i<2;i++) if(uOcc[i].w>.5&&length(gl_FragCoord.xy-uOcc[i].xy)<uOcc[i].z) bhk=0.;
  if(bhk>0.){
    vec3 rd=normalize(vec3((gl_FragCoord.xy-uRes*.5)/uFpx,1.));
    vec3 Q=uBH.xyz, ro=-Q;                                 /* the camera, seen from the hole */
    float tc=dot(Q,rd), b=length(cross(Q,rd));             /* how close the straight ray passes */
    const float RI=21.;                                     /* inside this sphere the path is traced (the disk reaches 19) */
    if(tc>0.&&b<RI*1.5){
      vec3 dir=rd;
      if(b<RI){
        vec3 n=normalize(uBHn.xyz), e1=normalize(abs(n.y)<.9?cross(n,vec3(0,1,0)):cross(n,vec3(1,0,0))), e2=cross(n,e1);
        float D=length(ro);
        vec3 p=D>RI?ro+rd*(tc-sqrt(RI*RI-b*b)):ro, v=rd;
        float h2=dot(cross(p,v),cross(p,v));
        vec3 T=vec3(1.); bool caught=false, out_=false;
        for(int i=0;i<150;i++){
          float r=length(p);
          if(r<1.){ caught=true; break; }
          if(r>RI*1.02&&dot(p,v)>0.){ out_=true; break; }
          /* leapfrog steps, finer near the hole: the path near the photon sphere (1.5) is delicate */
          float dt=clamp(.055*r*r/(r+.5),.012,.8);
          v+=-1.5*h2*p/pow(r,5.)*dt*.5;
          vec3 pn=p+v*dt;
          float rn=length(pn);
          v+=-1.5*h2*pn/pow(rn,5.)*dt*.5;
          /* crossing the disk's plane: the gas there */
          float s0=dot(p,n), s1=dot(pn,n);
          if(s0*s1<0.){
            vec3 x=mix(p,pn,s0/(s0-s1)); float rr=length(x);
            if(rr>3.&&rr<19.){
              /* the thin disk's temperature (inner edge at the last stable orbit, 3 radii) */
              float Tn=pow(3./rr,.75)*pow(max(1.-sqrt(3./rr),0.),.25)/.488;   /* 1 at its hottest (4.1 radii) */
              /* it orbits: towards us or away (Doppler), and deep in the pull (gravitational) */
              vec3 uo=normalize(cross(n,x)); float be=min(sqrt(.5/(rr-1.)),.7), ga=inversesqrt(1.-be*be);
              float opz=ga*(1.+be*dot(uo,normalize(v)))/sqrt(1.-1./rr);
              float g=1./max(opz,.1), Tobs=Tn*g;
              float gz=gas(rr,vec2(dot(x,e1),dot(x,e2)));
              float edge=smoothstep(3.,3.35,rr)*(1.-smoothstep(10.,19.,rr));
              float I=pow(Tobs,3.)*gz*edge*1.6;               /* (softer than T⁴, so the long outer disk still shows) */
              vec3 em=palette(Tobs)*min(I,6.)*1.3
                     +vec3(1.,.36,.82)*knots(rr,vec2(dot(x,e1),dot(x,e2)))*edge*2.2;
              float al=clamp((.72+.25*gz)*edge,0.,.97);     /* thick gas: what lies behind it hardly shows (thinner at the edges) */
              /* a dark reddish lane of dust through the outer disk */
              float lane=exp(-pow((rr-13.)/1.3,2.))*(.55+.45*gz);
              em=mix(em,vec3(.5,.08,.16)*.45,lane*.75); al=max(al,lane*.9);
              /* a thin bright ring in the disk, where the gas crowds */
              em+=vec3(1.,.82,.95)*exp(-pow((rr-6.3)/.05,2.))*1.8;
              add+=T*em;
              T*=1.-al;
            }
          }
          p=pn;
          if(T.g<.01) break;
        }
        if(caught||!out_){ hole=1.; bgT=0.; }
        /* the sky is bent only close to the hole (the ring of light and the stars around it); farther
           out the bending fades away quickly, so no big ball of warped sky sits around it */
        else { dir=normalize(mix(rd,normalize(v),1.-smoothstep(6.,13.,b))); bgT=T.g; }
      }
      if(bgT>0.){
        /* the sky the ray escapes to: the picture, seen in that direction */
        uv=dir.z>.02?(uRes*.5+dir.xy/dir.z*uFpx)/uRes:vec2(-1.);
      }
      /* a soft pink glow around it, and a faint blue-violet haze farther out */
      if(b>2.6) add+=(vec3(1.,.38,.82)*.1*exp(-(b-2.6)*.4)+vec3(.45,.4,1.)*.045*exp(-b*.1))*(1.-smoothstep(RI,RI*1.5,b));
      add*=uBH.w; hole*=uBH.w; bgT=mix(1.,bgT,uBH.w);
    }
  }
  /* where the bent ray points off the picture there is nothing to show: the unbent sky, faded in at the border */
  vec3 bgc=texture(uHdr,vUv).rgb*uOutK+bloomAt(vUv)*uBloomK*uOutK;
  /* a pixel the half-float picture could not hold (NaN or infinity): the glow around it instead of a black dot */
  if(any(isnan(bgc))||any(isinf(bgc))) bgc=bloomAt(vUv)*(1.+uBloomK)*uOutK;
  if(uv!=vUv){
    float inside=uv.x<0.?0.:smoothstep(0.,.03,min(min(uv.x,1.-uv.x),min(uv.y,1.-uv.y)));
    if(inside>0.) bgc=mix(bgc,texture(uHdr,uv).rgb*uOutK+bloomAt(uv)*uBloomK*uOutK,inside);
  }
  vec3 c=bgc*bgT*(1.-hole)+add*uOutK;
  c=1.-exp(-c*uExp);
  vec3 sky=mix(vec3(.008,.008,.012),vec3(.03,.032,.05),pow(vUv.y,1.6));
  c=c+sky*(1.-c)*(1.-hole);
  vec2 q=(vUv-.5)*vec2(uRes.x/uRes.y,1.);
  c*=mix(.5,1.,(1.-smoothstep(.35,1.05,length(q))));
  c+=(h(gl_FragCoord.xy+fract(uTime*7.3)*97.)-.5)/255.;
  o=vec4(c,1.);
}`;

  /* a quad on the screen around a point (css px), half-size and turn: vQ runs from -1 to 1 across it */
  const SPRITE_VS=HEAD+`uniform vec2 uCss, uC, uHalf; uniform float uRot; out vec2 vQ;
void main(){
  vec2 c=vec2(float(gl_VertexID&1),float(gl_VertexID>>1))*2.-1.;
  float cs=cos(uRot), sn=sin(uRot); vec2 q=c*uHalf;
  vec2 p=uC+vec2(cs*q.x-sn*q.y,sn*q.x+cs*q.y);
  gl_Position=vec4(p.x/uCss.x*2.-1.,1.-p.y/uCss.y*2.,0.,1.); vQ=c;
}`;

  return {HEAD, NOISE, ORBITS, FULL_VS, MAP_FS, PART_VS, PART_FS, VOL_FS, FAR_VS, DOT_FS, NEBGEN_FS, BANDGEN_FS, DUST_FS, NEB_VS, NEB_FS, DEEP_VS, DEEP_FS, FIELD_VS, FIELD_FS, MET_VS, MET_FS, COMET_VS, COMET_FS, HOLE_FS, BRIGHT_FS, BLUR_FS, CARD_FS, UP_FS, COMP_FS, SPRITE_VS};
})();
