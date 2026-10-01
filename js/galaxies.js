/* ==========================================================
   galaxies.js — what each galaxy of universe.js is made of: where it sits,
   how it is turned, its disk, bulge, colours, rotation and how many stars.
   Data only: change a number here and the galaxy changes, nothing else to
   touch. A new galaxy: a new entry (and, for a section or a sight, its place
   in home.js / universe.js PLACES). Read once by universe.js.
   ========================================================== */
const UNIVERSE_GALAXIES=(function(){
  /* ---------- the galaxies ----------
     where each sits seen from home (at: fraction of the half screen, x right and
     y down; z: how far; r: size), how it is turned (tilt, roll), and what it is made of:
     disk: h scale length · rc/ex1/ex2 the shape of the orbits (1 = round) · twist how
       much the orbits turn from centre to edge (the arms); logS (optional): wound as a logarithmic spiral of
       that scale, the arms keeping their pitch out to the rim · hz thickness · warp
       wobble of the arms · floc patchiness · young/hii/dust: how much of each and
       how tightly they follow the arms (k), dust lag: dust lanes sit on the arms'
       inner edge
     bulge: I brightness, Rb size, n profile (higher = steeper core), q axis ratios
     rot: vmax orbital speed (radians/s at the edge), ac core size, pat speed of the
       arms pattern (minus: the arms trail)
     stars: how many of each kind (before the budget) · gain: brightness of each part
     star: the colour of its bright star in the sky of stars (Effects = Medium; sky.js) */
  const GALAXIES={
    /* home: a blue "grand design" spiral seen nearly face-on (like the Whirlpool, M51): two
       strong, tightly wound arms full of pink knots, and a small yellow companion at the
       end of one of them (NGC 5195). It is also a sight of its own ("whirlpool", see PLACES) */
    nolan:{kind:"spiral", r:3.9, tilt:.42, roll:.55, at:{d:[.62,-.42],m:[.62,-.56]}, z:60, seed:23,
      disk:{h:.3, rc:.1, ex1:.7, ex2:.78, twist:11, logS:.32, phi0:1.1, hz:.05, warp:.05, floc:.42,
            young:{h:.36,k:1.7}, hii:{c1:1.45,c2:2.1}, dust:{h:.36,k:1.8,lag:.2}},
      bulge:{I:.26, Rb:.055, n:2, q:[1,.95,.8]},
      col:{old:[1,.9,.78], young:[.55,.72,1], hii:[1,.34,.6], core:[1,.86,.66]},
      rot:{vmax:.09, ac:.05, pat:-.04},              /* it turns visibly: its arms sweep round while you look */
      stars:{old:18000, young:11000, hii:1800, bulge:6000, halo:900, gc:8},
      gain:{disk:1.45, young:1, hii:1.2, dust:2.8, bulge:1, stars:1}},
    /* UC3M: a golden barred spiral (like NGC 1300), low on the left: a straight bar of old stars
       through the middle, and two arms that sweep out from its ends (the inner orbits are long
       and aligned, and hardly turn: that is the bar) */
    uc3m:{kind:"spiral", star:"255,200,130", r:4.6, tilt:.72, roll:-.5, at:{d:[-.7,.62],m:[-.62,.74]}, z:58, seed:11,
      disk:{h:.3, rc:.3, ex1:.3, ex2:.92, twist:1.9, phi0:.4, hz:.05, warp:.04, floc:.45,
            young:{h:.4,k:1.6}, hii:{c1:1.45,c2:2.05}, dust:{h:.38,k:1.8,lag:.14}},
      bulge:{I:.42, Rb:.13, n:1.1, q:[1,.28,.24]},        /* long and thin: the bar */
      col:{old:[1,.8,.52], young:[.74,.8,1], hii:[1,.42,.58], core:[1,.76,.48]},
      rot:{vmax:.03, ac:.06, pat:-.01},              /* lively: it turns visibly while you look */
      stars:{old:26000, young:9000, hii:1300, bulge:9000, halo:1200, gc:9},
      gain:{disk:.9, young:.7, hii:.7, dust:2.2, bulge:1, stars:1}},
    /* Nolan: a big round ember, an amber elliptical */
    forge:{kind:"elliptical", star:"255,176,96", r:3.1, tilt:.6, roll:-.2, at:{d:[-.66,-.5],m:[-.62,-.74]}, z:75, seed:37,
      bulge:{I:.3, Rb:.26, n:3, q:[1,.86,.72]},
      col:{old:[1,.74,.48], core:[1,.76,.5]},
      rot:{vmax:.008, ac:.2, pat:0},
      stars:{bulge:22000, halo:1500, gc:18},
      gain:{bulge:1, stars:1}},
    /* a ring galaxy (like Hoag's Object): a round yellow core, a dark gap, and a nearly perfect
       ring of young blue stars around it; two small companions nearby. Not a section: a sight */
    /* (farther, tilted into an ellipse, its ring soft and clumpy: a perfect bright circle read as a drawn blue ring) */
    ringgalaxy:{kind:"ring", r:4.4, tilt:1.0, roll:-.9, at:{d:[.74,.42],m:[.62,.6]}, z:150, seed:41,
      disk:{h:.07, rc:.2, ex1:1, ex2:1, twist:0, phi0:0, hz:.03, warp:.03, floc:.85,
            young:{h:.5,k:1}, hii:{c1:9,c2:10}, dust:{h:.6,k:1,lag:0}, ring:{a:.66,w:.1,light:.55,dust:.35,stars:2600}},
      bulge:{I:.55, Rb:.11, n:2.5, q:[1,1,.95]},
      col:{old:[.72,.78,.98], young:[.72,.8,1], hii:[1,.5,.75], core:[1,.84,.55]},
      rot:{vmax:.04, ac:.08, pat:.025},               /* its knotty ring turns */
      stars:{old:3000, bulge:9000, halo:900, gc:6},
      gain:{disk:.9, young:0, hii:0, dust:1, bulge:1, stars:1}},
    /* a galaxy seen edge-on (like M104): a big bright bulge and a dark ring of dust. A sight too */
    edgeon:{kind:"ring", r:3.6, tilt:1.52, roll:.18, at:{d:[-.44,-.8],m:[.05,-.86]}, z:130, seed:53,
      disk:{h:.34, rc:.2, ex1:1, ex2:1, twist:0, phi0:0, hz:.028, warp:.02, floc:.4,
            young:{h:.4,k:1}, hii:{c1:9,c2:10}, dust:{h:.5,k:1,lag:0}, ring:{a:.72,w:.085,light:.35,dust:3.2}},
      bulge:{I:.9, Rb:.3, n:3, q:[1,1,.8]},
      col:{old:[1,.93,.84], young:[.8,.85,1], hii:[1,.5,.6], core:[1,.94,.84]},
      rot:{vmax:.03, ac:.1, pat:.015},
      stars:{old:12000, bulge:16000, halo:1200, gc:14},
      gain:{disk:.3, young:0, hii:0, dust:2.6, bulge:1, stars:1}}
  };
  /* small companions (not scenes): drawn with their host, placed in its own frame */
  const COMPANIONS=[
    {id:"m32", host:"ringgalaxy", off:[.3,.22,.08], size:.1, tilt:.4, roll:.9, seed:61,
      bulge:{I:.25,Rb:.3,n:2.5,q:[1,.84,.8]}, col:{old:[1,.86,.66],core:[1,.88,.7]}, rot:{vmax:.01,ac:.2,pat:0}, stars:{bulge:2200}, gain:{bulge:1,stars:1}},
    {id:"ngc5195", host:"nolan", off:[.8,.6,.08], size:.2, tilt:.35, roll:.4, seed:71,
      bulge:{I:.3,Rb:.3,n:2.2,q:[1,.85,.75]}, col:{old:[1,.82,.58],core:[1,.84,.62]}, rot:{vmax:.008,ac:.2,pat:0}, stars:{bulge:2600}, gain:{bulge:1,stars:1}},
    {id:"m110", host:"ringgalaxy", off:[-.62,-.55,.1], size:.2, tilt:1.0, roll:-.4, seed:67,
      bulge:{I:.12,Rb:.45,n:1.6,q:[1,.6,.55]}, col:{old:[1,.9,.76],core:[1,.9,.78]}, rot:{vmax:.006,ac:.3,pat:0}, stars:{bulge:2600}, gain:{bulge:.8,stars:1}}
  ];

  return {GALAXIES, COMPANIONS};
})();
