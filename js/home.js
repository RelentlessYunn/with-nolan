/* ==========================================================
   home.js — the home screen. Its first screen is only the hero: the logo,
   NOLAN, the time, the greeting and the sky outside. Scrolling down shows
   where you can go: the sections (UC3M, Nolan) and the sights of the
   universe, each one a place the camera flies to and looks at whole (the
   Earth, the Moon, the black hole, the galaxies, the nebulae…), with arrows to the
   previous and the next one. Notes and Settings open inside it too.
   A guest (gate.js) sees only the hero and the sights: no UC3M, no Nolan,
   no Notes (css: html[data-guest]; router.js keeps their routes away).
   It behaves like a window on top of everything: the page behind cannot be
   clicked or tabbed into, and Escape goes back (from a sight to home, from
   home to the app).
   Every section is a galaxy of the universe (universe.js): opening a
   section flies the camera into its galaxy, coming home flies back out.
   Routes (#home, #nolan, #earth, #orion…) are decided in router.js.
   ========================================================== */
const Home=(function(){
  const P=$("#portal"), views=$$("#portal .p-view");
  const behind=[$("header.top"),$("nav.bar"),$("body > div.wrap")].filter(Boolean);
  let returnFocus=null, closeTimer=0;
  const greeting=h=>t(h<6?"home.night":h<14?"home.morning":h<21?"home.afternoon":"home.night");
  /* text that only changes when it has to (no flicker, no restarted animations) */
  const put=(el,text)=>{ if(el&&el.textContent!==text) el.textContent=text; };
  const putHtml=(el,html)=>{ if(el&&el.dataset.html!==html){ el.dataset.html=html; el.innerHTML=html; } };

  /* UC3M card summary: week, class now or next, and next assessment */
  function draw(){
    const n=new Date(), k=isoDate(n), m=minutesOf(n);
    put($("#homeTime"),hhmm(m));
    put($("#homeGreeting"),t(Gate.guest()?"home.greetingGuest":"home.greeting",{hello:greeting(n.getHours()),name:"Nolan"}));
    const cs=classesOn(k), next=cs.find(c=>classState(c,m)!=="over");
    const cls=next?t(classState(next,m)==="now"?"home.now":"home.next",{subject:SUBJECTS[next.subject].name,time:hhmm(next.start),room:next.room})
      :cs.length?t("home.doneToday"):(noClassReason(k)||{text:t("home.noClassToday")}).text.replace(/\.$/,"");
    const ex=EVENTS.filter(e=>isAssessment(e)&&lastDay(e)>=k).sort(byDate)[0];
    const exam=ex?t("home.nextExam",{type:typeName(ex.type),subject:SUBJECTS[ex.subject].short,when:whenLabel(ex,k)}):"";
    const w=weekOf(k);
    putHtml($("#homeUc3mInfo"),(w?`<i>${esc(t("header.week",{n:w.n}))}</i>`:"")+`<span>${esc(cls)}</span>`+(exam?`<span>${esc(exam)}</span>`:""));
  }

  /* ---------- the sights, in the order of home's list (and of the arrows between them) ----------
     Each: its colour and its icon. Its words are in i18n.js (sight.<id>.name, tag, fact, text);
     where it is and how the camera frames it, in universe.js (PLACES) and wonders.js. */
  const SIGHTS=[
    {id:"earth", ac:"#6CB8FF", icon:`<svg viewBox="0 0 48 48" aria-hidden="true"><circle class="f" cx="22" cy="26" r="16"/><path class="f2" d="M12.4 19.6c2.6-.5 4.4 1 6.3.4 2.2-.7 3.7 1 3.2 3.2-.5 2.4-3 2.7-3.2 5-.2 2 1.7 3.4 1 5.4-.4 1.2-1.6 1.9-2.9 1.6"/><path d="M27.2 13c.4 2.6 2.8 3 3.4 5.2.5 2-1.2 3.4.3 5.3 1.3 1.6 3.6 1.1 4.9 2.7"/><circle class="dot" cx="40.5" cy="9.5" r="3"/></svg>`},
    {id:"moon", ac:"#D8DEEA", icon:`<svg viewBox="0 0 48 48" aria-hidden="true"><path class="f2" d="M23.8 7A17 17 0 1 0 40 29.7A14 14 0 1 1 23.8 7z"/><circle class="dot" cx="14" cy="26" r="1.9"/><circle class="dot" cx="21" cy="36" r="1.4"/><circle class="dot" cx="11" cy="18" r="1.1"/></svg>`},
    {id:"blackhole", ac:"#FF8AD8", icon:`<svg class="i-hole" viewBox="0 0 48 48" aria-hidden="true"><ellipse class="disk" cx="24" cy="25" rx="21" ry="5.5"/><path class="arc" d="M11.5 23.5a12.5 12.5 0 0 1 25 0"/><circle class="shadow" cx="24" cy="24" r="8.2"/><path class="front" d="M3.4 25.8C9 29 39 29 44.6 25.8"/></svg>`},
    {id:"whirlpool", ac:"#8FB6FF", icon:`<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M24 24c0-3.5 4.5-4.5 6.8-1.8 3.2 3.8-.6 9.8-6.8 9.8-7.4 0-11.5-7.4-8.8-13.6C18.6 11 29 8.6 36 13"/><path d="M24 24c0 3.5-4.5 4.5-6.8 1.8-3.2-3.8.6-9.8 6.8-9.8 7.4 0 11.5 7.4 8.8 13.6C29.4 37 19 39.4 12 35"/><circle class="core" cx="24" cy="24" r="2.6"/><circle class="dot" cx="38.6" cy="11.4" r="2.3"/></svg>`},
    {id:"ringgalaxy", ac:"#B6A6FF", icon:`<svg viewBox="0 0 48 48" aria-hidden="true"><ellipse class="rim" cx="24" cy="24" rx="17" ry="12" transform="rotate(-20 24 24)"/><circle class="f2" cx="24" cy="24" r="5"/><circle class="core" cx="24" cy="24" r="2.4"/><circle class="dot" cx="41" cy="11" r="1.4"/><circle class="dot" cx="8" cy="38" r="1.1"/></svg>`},
    {id:"edgeon", ac:"#FFD9A8", icon:`<svg viewBox="0 0 48 48" aria-hidden="true"><ellipse class="f" cx="24" cy="24" rx="21" ry="5.5"/><ellipse class="f2" cx="24" cy="24" rx="9" ry="7"/><path class="band" d="M3.5 25.4C11 28 37 28 44.5 25.4"/><circle class="core" cx="24" cy="23" r="2.2"/></svg>`},
    {id:"orion", ac:"#FF7597", icon:`<svg viewBox="0 0 48 48" aria-hidden="true"><path class="f" d="M9 30c-2.5-5 1-10.5 6-10 .5-5.5 7-8.5 11.5-5 3.5-4 10.5-2.5 11 3 5 .5 7 6.5 3.5 10 1.5 5-3.5 9-8 7-3 3.5-9 3.5-11.5 0-5 2-10.5-.5-12.5-5z"/><circle class="dot" cx="22" cy="24" r="1.7"/><circle class="dot" cx="26.2" cy="22.4" r="1.3"/><circle class="dot" cx="24.4" cy="27.4" r="1.2"/><circle class="dot" cx="28" cy="26.2" r="1"/></svg>`},
    {id:"pleiades", ac:"#8DB9FF", icon:`<svg viewBox="0 0 48 48" aria-hidden="true"><path class="haze" d="M9 33 27 21M15 38l18-12M20 16l14-9"/><circle class="dot" cx="23" cy="20" r="2.7"/><circle class="dot" cx="10" cy="19" r="1.9"/><circle class="dot" cx="9" cy="23" r="1.1"/><circle class="dot" cx="33" cy="23" r="1.9"/><circle class="dot" cx="28" cy="14.5" r="1.5"/><circle class="dot" cx="29.5" cy="28" r="1.7"/><circle class="dot" cx="33" cy="33" r="1.4"/><circle class="dot" cx="38" cy="28.5" r="1"/><circle class="dot" cx="32.5" cy="37" r=".9"/></svg>`},
    {id:"ring", ac:"#5EE0CF", icon:`<svg viewBox="0 0 48 48" aria-hidden="true"><ellipse class="f" cx="24" cy="24" rx="16" ry="13"/><ellipse class="rim" cx="24" cy="24" rx="12" ry="9.5"/><circle class="dot" cx="24" cy="24" r="1.5"/></svg>`},
    {id:"binary", ac:"#FF9A62", icon:`<svg viewBox="0 0 48 48" aria-hidden="true"><path class="f2" d="M19 11.5A12.5 12.5 0 1 0 25.3 34.8Q30 32 33 24Q30 16 25.3 13.2A12.5 12.5 0 0 0 19 11.5z"/><path d="M33 24c2.2-.2 3.8-.9 5-1.9"/><ellipse cx="40.5" cy="21.5" rx="5.2" ry="1.9"/><circle class="dot" cx="40.5" cy="21.5" r="1.4"/></svg>`},
    {id:"antennae", ac:"#C8A8FF", icon:`<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M20.5 22.5C16 16 9 14.5 5.5 18.5"/><path d="M27.5 26.5C32 33 39 34.5 42.5 30.5"/><ellipse class="f2" cx="21.5" cy="23.5" rx="5.4" ry="3.6" transform="rotate(-30 21.5 23.5)"/><ellipse class="f2" cx="26.8" cy="25.4" rx="4.8" ry="3.2" transform="rotate(40 26.8 25.4)"/><circle class="dot" cx="21.5" cy="23.5" r="1.4"/><circle class="dot" cx="26.8" cy="25.4" r="1.2"/></svg>`}
  ];
  const isSight=v=>SIGHTS.some(s=>s.id===v);
  const nameOf=id=>t("sight."+id+".name");
  /* a sight's words; the Moon's follow its real phase tonight (astro.js) */
  function words(id,key){
    if(id!=="moon"||typeof Astro==="undefined") return t("sight."+id+"."+key);
    const m=Astro.moon(new Date());
    return t("sight.moon."+key,{phase:t("moon."+m.name),pct:Math.round(m.fraction*100)});
  }
  /* ---------- the journey: home's big button starts a tour through the sights; on each one a dock at the
     foot of the screen holds every place (the one you are at lit: choose any to fly there), the arrows to
     the one before and after (the list goes round), and home. You choose: nothing moves on by itself ---------- */
  const tour=$("#tour"), tourList=$("#tourList");
  function drawSights(){
    if(tourList&&!tourList.children.length){
      tourList.innerHTML=SIGHTS.map(s=>`<a class="t-stop" role="listitem" href="#${s.id}" data-scene="${s.id}" data-sight="${s.id}" style="--ac:${s.ac}">`+
        `<span class="t-ic p-ic">${s.icon}</span><span class="t-name"></span></a>`).join("");
    }
    SIGHTS.forEach(s=>{ const a=tourList&&tourList.querySelector(`[data-sight="${s.id}"]`); if(a){ put(a.querySelector(".t-name"),nameOf(s.id)); a.title=words(s.id,"tag"); } });
    put($("#tourCount"),t("s.tourCount",{n:SIGHTS.length}));
  }

  /* a sight's own page: what it is, and a few words; the dock below says where you are */
  function renderSight(id){
    const i=SIGHTS.findIndex(s=>s.id===id);
    const box=$("#sightView");
    box.style.setProperty("--ac",SIGHTS[i].ac);
    box.innerHTML=`<p class="s-fact">${esc(words(id,"fact"))}</p>`+
      `<h2>${esc(nameOf(id))}</h2>`+
      `<p class="s-text">${esc(words(id,"text"))}</p>`+
      `<p class="s-step">${esc(t("s.sight.count",{n:i+1,total:SIGHTS.length}))}</p>`;
    if(tour){
      tour.style.setProperty("--ac",SIGHTS[i].ac);
      tourList.querySelectorAll(".t-stop").forEach(a=>{ if(a.dataset.sight===id) a.setAttribute("aria-current","location"); else a.removeAttribute("aria-current"); });
      /* the arrows: to the one before and after */
      const n=SIGHTS.length;
      [["prev",(i+n-1)%n],["next",(i+1)%n]].forEach(([dir,k])=>{
        const a=tour.querySelector(`.t-arrow[data-dir="${dir}"]`), to=SIGHTS[k].id;
        a.setAttribute("href","#"+to); a.dataset.scene=to; a.style.setProperty("--ac",SIGHTS[k].ac);
        a.setAttribute("aria-label",t("s.sight."+dir,{name:nameOf(to)})); a.title=nameOf(to);
      });
      /* the place you are at comes to the middle of the dock (a phone shows only some at a time) */
      const on=tourList.querySelector(".t-stop[aria-current]");
      if(on) requestAnimationFrame(()=>{ const x=on.offsetLeft+on.offsetWidth/2-tourList.clientWidth/2; tourList.scrollTo({left:x,behavior:lowMotion()?"auto":"smooth"}); });
    }
  }

  /* which galaxy (or sight) each view of home lives in */
  /* Notes and Settings belong to every section: they open where you are, without moving the camera */
  const PAGES=["notes","settings"];
  const here=()=>{ const s=Universe.scene(); return !s||s==="gate"?"home":s; };
  const sceneOf=view=>PAGES.includes(view)?here():view==="nolan"?"forge":isSight(view)?view:"home";
  let current="home";                                  /* the scene of what home shows now */
  let lastView="home";                                 /* the last view of home that is not Notes or Settings */
  let homeScroll=0;                                    /* how far down home's list you were when you left it */
  let opened=false;
  function open(view,subroute,backTo){
    draw();
    /* the camera goes to this view's galaxy; the first time, no flight (it is already there) */
    /* (behind the PIN the camera stays in deep space, ready for the flight) */
    current=sceneOf(view);
    if(!Gate.locked()){ Universe.go(current,{animate:opened}); opened=true; }
    /* "← Back" in Notes and Settings returns to where you came from: a tab of the app, or a view of home */
    if(PAGES.includes(view)){
      const fromApp=P.hidden||P.classList.contains("leaving");
      const back=fromApp?"#"+(backTo||"schedule"):"#"+lastView;
      $$("#portal .p-back-top").forEach(a=>a.setAttribute("href",back));
    } else lastView=view+(subroute?"/"+subroute:"");
    /* the UC3M card points at the tab you were on */
    if(backTo) $("#homeUc3m").setAttribute("href","#"+backTo);
    if(view==="nolan") Nolan.render($("#nolanView"),subroute||"");
    const sight=isSight(view), shown=sight?"sight":view;
    if(sight) renderSight(view);
    const fresh=P.hidden||P.classList.contains("leaving"), before=P.dataset.view;
    if(!fresh&&before==="home"&&shown!=="home") homeScroll=P.scrollTop;
    views.forEach(v=>v.hidden=v.dataset.view!==shown);
    P.dataset.view=shown;
    if(tour) tour.hidden=!sight;
    clearTimeout(closeTimer);
    if(fresh) returnFocus=document.activeElement;
    P.classList.remove("leaving"); P.hidden=false;
    /* home opens at its hero; coming back to it from a sight, where you were in its list; anything else at its top */
    if(fresh) P.scrollTop=0;
    else if(shown==="home"&&before!=="home") P.scrollTop=homeScroll;
    else if(shown!==before||sight) P.scrollTop=0;
    scrolled();
    document.body.classList.add("portal-open");
    behind.forEach(el=>el.inert=true);
    /* focus goes into the window (Tab continues through the cards), without marking any */
    P.focus({preventScroll:true});
  }
  /* going to a view by its address (a link, Back, Escape): with the same flight and fades as a click, when
     home is open and the camera has somewhere else to go; otherwise it simply opens */
  function visit(view,subroute,backTo){
    const to=sceneOf(view);
    if(!P.hidden&&!P.classList.contains("leaving")&&!entering&&to!==current&&Universe.scene()!==to&&!PAGES.includes(view))
      enter(to,()=>open(view,subroute,backTo));
    else open(view,subroute,backTo);
  }
  function close(){
    if(P.hidden) return;
    Universe.go("uc3m");                                /* the app lives inside the UC3M galaxy */
    document.body.classList.remove("portal-open");
    behind.forEach(el=>el.inert=false);
    if(lowMotion()) P.hidden=true;
    else { P.classList.add("leaving"); closeTimer=setTimeout(()=>{ P.hidden=true; P.classList.remove("leaving"); },280); }
    if(returnFocus&&document.contains(returnFocus)&&returnFocus!==document.body) returnFocus.focus({preventScroll:true});
    returnFocus=null;
  }
  /* where Escape goes from what home shows now: home from a sight or Nolan, the way back from
     Notes and Settings; nothing on home itself (router.js then closes it) */
  function back(){
    const v=P.dataset.view;
    if(P.hidden||v==="home") return null;
    if(PAGES.includes(v)){ const a=$(`#portal .p-view[data-view="${v}"] .p-back-top`); return a?a.getAttribute("href"):"#home"; }
    return "#home";
  }
  document.addEventListener("minute",()=>{ if(!P.hidden) draw(); });
  document.addEventListener("newDay",drawSights);           /* the Moon's phase */

  /* ---------- the first screen is the hero alone; the rest is further down ----------
     a small arrow at its foot says so, and fades once you scroll */
  function scrolled(){ P.classList.toggle("scrolled",P.scrollTop>24); }
  P.addEventListener("scroll",scrolled,{passive:true});
  const more=$("#homeMore");
  if(more) more.addEventListener("click",()=>{
    const list=$('#portal .p-view[data-view="home"]');
    if(list) P.scrollTo({top:list.offsetTop-24,behavior:lowMotion()?"auto":"smooth"});
  });

  /* ---------- the opening: the logo draws itself, NOLAN appears, then the rest ----------
     Played when the app starts (or right after the PIN), not every time home opens. */
  const root=document.documentElement;
  let introTimer=0, skipped=false;
  function intro(){
    if(skipped){ skipped=false; return; }               /* the whole opening was skipped: not this part either */
    if(P.hidden||!fullMotion()) return;
    /* back from changing a setting: the page must be ready and still when the passage opens */
    if(root.classList.contains("shift-arriving")) return;
    P.classList.remove("intro"); void P.offsetWidth; P.classList.add("intro"); root.classList.add("intro-on");
    clearTimeout(introTimer);
    introTimer=setTimeout(()=>{ P.classList.remove("intro"); root.classList.remove("intro-on"); },4200);
  }
  /* "Skip": while the opening plays (the flight in, after the PIN or on the first visit, and the logo
     drawing itself), a button ends it all at once: the camera lands, everything shows (css: cinema.css) */
  const skipBtn=$("#skipIntro");
  if(skipBtn) skipBtn.addEventListener("click",()=>{
    const flying=root.classList.contains("flying")||root.classList.contains("launching");
    skipped=flying&&!P.classList.contains("intro");     /* the logo would start on landing: not now */
    Universe.land();
    clearTimeout(introTimer); P.classList.remove("intro");
    root.classList.remove("intro-on","launching","flying");
    skipBtn.blur();
  });
  Gate.onUnlock(intro);
  Gate.onUnlock(draw);                                 /* the greeting: for Nolan, or for a guest */

  /* ---------- going somewhere: into a galaxy, or up to a sight ----------
     Home's content fades, the camera flies there, and what belongs there appears
     on arrival: go() is called then. */
  let entering=false, trip=0;
  function enter(id,go){
    if(entering) return;
    /* a flight: through the 3D universe, or into a star of the sky of stars (Quality = Medium) */
    if(!fancy()&&!(fullMotion()&&window.Stars)){ Universe.go(id,{animate:false}); go(); return; }
    entering=true;
    const me=++trip;                                    /* this trip; a later one makes its leftovers do nothing */
    const inner=$("#portal .p-in"), bar=$("#portal .p-bar"), from=location.hash;
    const fade=[{opacity:1,transform:"none"},{opacity:0,transform:"translateY(-10px)"}];
    inner.animate(fade,{duration:500,easing:"ease-in",fill:"forwards"});
    if(bar) bar.animate(fade,{duration:400,easing:"ease-in",fill:"forwards"});
    P.classList.add("entering");                        /* nothing faded can be clicked meanwhile (css) */
    const reset=()=>{ if(me!==trip) return; inner.getAnimations().forEach(a=>a.cancel()); if(bar) bar.getAnimations().forEach(a=>a.cancel()); P.classList.remove("entering"); };
    /* the trip was interrupted (Escape, Back, another page): home comes back as it was */
    const abort=()=>{ if(me!==trip) return; reset(); entering=false; };
    Universe.go(id,{arriveAt:.82,onCancel:abort,onArrive:()=>{
      if(location.hash!==from){ abort(); return; }      /* you went somewhere else meanwhile */
      go();
      entering=false;                                   /* there: what shows can be clicked at once (the next sight, too) */
      if(id==="uc3m"){ document.body.classList.add("arriving"); setTimeout(reset,400); } else reset();
      setTimeout(()=>document.body.classList.remove("arriving"),1200);
    }});
  }
  /* impatient? a second click (or Enter / Space) during the trip skips it: the section shows at once */
  document.addEventListener("click",ev=>{
    if(entering&&Universe.skip()){ ev.preventDefault(); ev.stopPropagation(); }
  },true);
  document.addEventListener("keydown",ev=>{
    if(entering&&(ev.key==="Enter"||ev.key===" ")&&Universe.skip()) ev.preventDefault();
  },true);
  /* Nolan, the journey and the places of its dock open inside home (router.js handles UC3M) */
  const onScene=ev=>{
    const a=ev.target.closest("a[data-scene]");
    if(!a||a.id==="homeUc3m"||ev.defaultPrevented||ev.button||ev.metaKey||ev.ctrlKey||ev.shiftKey||ev.altKey) return;
    ev.preventDefault();
    const h=a.getAttribute("href").slice(1);
    enter(a.dataset.scene,()=>{ Router.push("#"+h); const [v,...rest]=h.split("/"); open(v,rest.join("/")); });
  };
  P.addEventListener("click",onScene);                  /* (the dock too: it is inside home's window) */
  /* on a sight, the arrow keys go to the one before or after */
  document.addEventListener("keydown",ev=>{
    if(P.hidden||P.dataset.view!=="sight"||entering||ev.altKey||ev.ctrlKey||ev.metaKey||(ev.key!=="ArrowLeft"&&ev.key!=="ArrowRight")) return;
    if(ev.target.closest&&ev.target.closest("input,textarea,select,[contenteditable]")) return;
    const a=tour&&tour.querySelector(`.t-arrow[data-dir="${ev.key==="ArrowLeft"?"prev":"next"}"]`);
    if(a){ ev.preventDefault(); a.click(); }
  });
  drawSights();

  /* scene(): where the camera belongs for what is on screen (the app lives in UC3M) */
  return {open, visit, close, enter, intro, back, isSight, sights:()=>SIGHTS.map(s=>s.id),
    scene:()=>P.hidden||P.classList.contains("leaving")?"uc3m":current, isOpen:()=>!P.hidden&&!P.classList.contains("leaving")};
})();
