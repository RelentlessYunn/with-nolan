/* ==========================================================
   astro.js — the real sky, computed offline.
   · sun(): sunrise and sunset for any place (the NOAA / SunCalc method,
     accurate to a minute or two). weather.js uses it without connection.
   · moon(): the Moon's phase for a date (SunCalc's method): how much of it
     is lit, and whether it is growing or shrinking (the Moon of the opening).
   · shower(): the meteor shower going on, if any, on its real dates
     (after the International Meteor Organization's calendar), and how
     strong it is: universe.js makes more shooting stars, from its radiant.
   ========================================================== */
const Astro=(function(){
  const rad=Math.PI/180, DAY=864e5, J1970=2440588, J2000=2451545;
  const toDays=d=>d/DAY-.5+J1970-J2000;
  const fromJulian=j=>new Date((j+.5-J1970)*DAY);
  const E=rad*23.4397;
  function sun(date,lat,lng){
    const lw=rad*-lng, phi=rad*lat, d=toDays(new Date(date.getFullYear(),date.getMonth(),date.getDate(),12));
    const n=Math.round(d-.0009-lw/(2*Math.PI));
    const ds=.0009+lw/(2*Math.PI)+n;
    const M=rad*(357.5291+.98560028*ds);
    const L=M+rad*(1.9148*Math.sin(M)+.02*Math.sin(2*M)+.0003*Math.sin(3*M))+rad*102.9372+Math.PI;
    const dec=Math.asin(Math.sin(E)*Math.sin(L));
    const noon=J2000+ds+.0053*Math.sin(M)-.0069*Math.sin(2*L);
    const w=Math.acos((Math.sin(-.833*rad)-Math.sin(phi)*Math.sin(dec))/(Math.cos(phi)*Math.cos(dec)));
    const set=J2000+.0009+(w+lw)/(2*Math.PI)+n+.0053*Math.sin(M)-.0069*Math.sin(2*L);
    return {rise:fromJulian(noon-(set-noon)), set:fromJulian(set)};
  }

  /* ---------- the Moon's phase ---------- */
  const ra=(l,b)=>Math.atan2(Math.sin(l)*Math.cos(E)-Math.tan(b)*Math.sin(E),Math.cos(l));
  const decl=(l,b)=>Math.asin(Math.sin(b)*Math.cos(E)+Math.cos(b)*Math.sin(E)*Math.sin(l));
  function sunCoords(d){
    const M=rad*(357.5291+.98560028*d), C=rad*(1.9148*Math.sin(M)+.02*Math.sin(2*M)+.0003*Math.sin(3*M));
    const L=M+C+rad*102.9372+Math.PI;
    return {ra:ra(L,0),dec:decl(L,0)};
  }
  function moonCoords(d){
    const L=rad*(218.316+13.176396*d), M=rad*(134.963+13.064993*d), F=rad*(93.272+13.22935*d);
    const l=L+rad*6.289*Math.sin(M), b=rad*5.128*Math.sin(F), dist=385001-20905*Math.cos(M);
    return {ra:ra(l,b),dec:decl(l,b),dist};
  }
  /* phase: 0 new, .25 first quarter, .5 full, .75 last quarter; fraction: how much is lit */
  function moon(date){
    const d=toDays(date), s=sunCoords(d), m=moonCoords(d), sdist=149598000;
    const phi=Math.acos(Math.sin(s.dec)*Math.sin(m.dec)+Math.cos(s.dec)*Math.cos(m.dec)*Math.cos(s.ra-m.ra));
    const inc=Math.atan2(sdist*Math.sin(phi),m.dist-sdist*Math.cos(phi));
    const angle=Math.atan2(Math.cos(s.dec)*Math.sin(s.ra-m.ra),Math.sin(s.dec)*Math.cos(m.dec)-Math.cos(s.dec)*Math.sin(m.dec)*Math.cos(s.ra-m.ra));
    const fraction=(1+Math.cos(inc))/2, phase=.5+.5*inc*(angle<0?-1:1)/Math.PI;
    /* its name: new, waxing crescent, first quarter, waxing gibbous, full, and back */
    const names=["new","waxingCrescent","firstQuarter","waxingGibbous","full","waningGibbous","lastQuarter","waningCrescent"];
    return {phase,fraction,name:names[Math.round(phase*8)%8],inc,angle};
  }
  /* the Moon as it hangs in the sky of a place now (SunCalc's formulas): how the Sun lights it (inc: the
     angle Sun–Moon–Earth, 0 full, π new) and from where on its disc: the bright edge, measured from its
     north point towards its east (chi), and how far its north is turned from straight up because of where
     it stands in the sky (q, the parallactic angle). Both on the screen: up is towards the zenith */
  function moonSky(date,lat,lng){
    const d=toDays(date), m=moonCoords(d), il=moon(date);
    const lw=rad*-lng, phi=rad*lat, H=rad*(280.16+360.9856235*d)-lw-m.ra;
    const q=Math.atan2(Math.sin(H),Math.tan(phi)*Math.cos(m.dec)-Math.sin(m.dec)*Math.cos(H));
    return {inc:Math.acos(Math.max(-1,Math.min(1,2*il.fraction-1))),chi:il.angle,q,phase:il.phase};
  }

  /* ---------- meteor showers ---------- */
  /* peak (month, day), how many days either side it lasts, its strength (ZHR), and where its
     radiant sits on the screen (x, y as a share of it) */
  const SHOWERS=[
    {id:"quadrantids",m:1,d:3,w:1.5,zhr:110,rx:.3,ry:.16},
    {id:"lyrids",m:4,d:22,w:2,zhr:18,rx:.72,ry:.2},
    {id:"etaAquariids",m:5,d:6,w:4,zhr:50,rx:.2,ry:.3},
    {id:"perseids",m:8,d:12,w:5,zhr:100,rx:.78,ry:.14},
    {id:"draconids",m:10,d:8,w:1,zhr:10,rx:.5,ry:.1},
    {id:"orionids",m:10,d:21,w:4,zhr:20,rx:.25,ry:.2},
    {id:"leonids",m:11,d:17,w:2,zhr:15,rx:.68,ry:.24},
    {id:"geminids",m:12,d:14,w:3,zhr:150,rx:.4,ry:.15},
    {id:"ursids",m:12,d:22,w:1.5,zhr:10,rx:.62,ry:.1}
  ];
  function shower(date){
    let best=null;
    SHOWERS.forEach(s=>{
      /* the nearest peak, this year or the next/previous one */
      let dd=Infinity;
      [-1,0,1].forEach(y=>{ const pk=new Date(date.getFullYear()+y,s.m-1,s.d,12); dd=Math.min(dd,Math.abs(date-pk)/DAY); });
      const strength=Math.sqrt(s.zhr/150)*Math.exp(-Math.pow(dd/s.w,2));
      if(strength>.06&&(!best||strength>best.strength)) best={...s,strength,share:.35+.5*strength,peak:dd<1};
    });
    return best;
  }

  return {sun,moon,moonSky,shower};
})();
