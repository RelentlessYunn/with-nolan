/* ==========================================================
   run.js — automatic checks of the site in a real browser.
   Usage (from the project folder):   node tests/run.js
   Needs Playwright with Chromium (npm i playwright). It never touches the
   real cloud or the real weather: JSONBin and Open-Meteo calls are simulated
   or blocked (config.js may hold real keys).
   137 checks (without NOLAN_PIN: 133, and 3 skipped), by section:
   · Loading: no errors, nothing wider than a phone.
   · PIN and start: the entry screen (logo and guest button; the logo or a
     typed digit opens the keypad; nothing read from the cloud behind it),
     wrong and right PIN, the flight home, remembered device, Log out; the
     flights to UC3M and back, a second click during a trip, Notes and
     Settings inside home; the journey (its button starts the tour, the dock and the autopilot, and
     the arrow keys go on, Escape goes home, old #soon/… links land home),
     every sight framed whole on four screens, the black hole's own window.
   · Tabs and old Spanish links · Today (the red line moved in place, the
     minute, midnight, dates without a day) · Cloud (failed, slow and normal
     first reads, this device's copy at once, no ticks popping by
     themselves, grades with a comma) · Planner.
   · Home: the window, just the sky, #nolan, the hero alone on the first
     screen, the opening ending without a blink.
   · Guest: only the universe (no UC3M, Nolan, Notes or cloud), no pages
     with data even after reloading, Getafe's weather without the location
     and not kept, the way out in Settings.
   · Settings: the passage, English, every text (and every sight's words)
     translated, English dates, the animation levels.
   · Astral: weather, the three galaxies (UC3M's golden bar low on the
     left), the seven wonders, a supernova, the band of our galaxy, the
     Earth and the Moon (at the opening and as a place of their own), the
     Moon's phase and meteor showers, Quality = Low and Medium, the tasks
     constellation.
   · Compact header, swiping, idle, offline.
   Exits with code 1 if anything fails.
   The PIN: the repository is public, so the right PIN is never written in
   this file. The checks that type it read it from the environment:
       NOLAN_PIN=<the PIN> node tests/run.js
   Without NOLAN_PIN they are skipped (and say so); every other check runs,
   with this device already remembered (as a device that typed the PIN is).
   ========================================================== */
const {chromium}=require("playwright");
const path=require("path");
const crypto=require("crypto");
const PAGE="file://"+path.resolve(__dirname,"..","index.html");
let failures=0, checks=0, skipped=0;
const ok=(c,text)=>{ checks++; console.log((c?"  ✔ ":"  ✘ ")+text); if(!c) failures++; };
const skip=text=>{ skipped++; console.log(`  – ${text} (skipped: set NOLAN_PIN to run the PIN checks)`); };
const section=text=>console.log("\n"+text);

/* opens the page at a given time (local time of this computer) */
const DEVICE="f9d8f1cd96a7b5ffd4c1f01c7f5f0a7c00940726b33625b4755a1d4f25a91f20";
/* the PIN's hash, as gate.js makes it (a device that typed the right PIN keeps it: DEVICE) */
const pinHash=pin=>crypto.pbkdf2Sync(pin,"nolan·with-nolan·2026",150000,32,"sha256").toString("hex");
const PIN=process.env.NOLAN_PIN||"";
const PIN_OK=/^\d{6}$/.test(PIN)&&pinHash(PIN)===DEVICE;
const WRONG=["123456","654321"].find(k=>k!==PIN);    /* a PIN that is not the right one */
async function open(b,{path="",hash="",time="2026-09-21T13:06:00",mobile=false,viewport,clock="fixed",routes,before,settings,locked=false}={}){
  const ctx=await b.newContext({viewport:viewport||(mobile?{width:390,height:844}:{width:1280,height:900}),hasTouch:mobile,isMobile:mobile});
  const p=await ctx.newPage();
  p.errors=[]; p.requests=[];
  p.on("pageerror",e=>p.errors.push(e.message));
  p.on("request",r=>p.requests.push(r.url()));        /* every request the page makes, even the ones routed away */
  await p.route(/fonts\.(googleapis|gstatic)\.com/,r=>r.abort());
  /* never the real cloud (config.js may hold real keys) nor the real weather: a test that needs
     them routes its own fake below, which Playwright tries first */
  await p.route("https://api.jsonbin.io/**",r=>r.abort());
  await p.route(/open-meteo\.com|bigdatacloud\.net/,r=>r.abort());
  if(routes) await routes(p);
  /* the checks read the Spanish texts: Spanish unless a test asks otherwise (English is the site's default) */
  await p.addInitScript(s=>{ if(!localStorage.getItem("settings")) localStorage.setItem("settings",s); },JSON.stringify(Object.assign({lang:"es"},settings||{})));
  /* this device already knows the PIN, unless the test is about the gate */
  if(!locked) await p.addInitScript(k=>{ if(!sessionStorage.getItem("keep")) localStorage.setItem("nolan-device",k); },DEVICE);
  if(before) await p.addInitScript(before);
  if(clock==="fixed") await p.clock.setFixedTime(new Date(time)); else await p.clock.install({time:new Date(time)});
  await p.goto(PAGE+path+(hash?"#"+hash:""),{waitUntil:"load",timeout:60000});   /* (a software graphics card can be slow to start) */
  await p.waitForTimeout(clock==="fixed"?900:50);
  return p;
}
/* simulated JSONBin: remembers the last write */
function fakeCloud(initial,mode,writes){
  return async p=>{
    let reads=0;
    await p.route("https://api.jsonbin.io/**",async r=>{
      if(r.request().method()==="PUT"){ writes.push(JSON.parse(r.request().postData())); return r.fulfill({status:200,body:"{}",contentType:"application/json"}); }
      reads++;
      if(mode==="fails"&&reads===1) return r.fulfill({status:503,body:"down"});
      if(mode==="slow"&&reads===1) await new Promise(x=>setTimeout(x,2500));
      const rec=writes.length?writes[writes.length-1]:initial;
      return r.fulfill({status:200,contentType:"application/json",body:JSON.stringify({record:rec})});
    });
  };
}
/* simulated Open-Meteo: 24°, sunset at 20:13 on 23 Sep */
const WEATHER={current:{temperature_2m:24.4,weather_code:1,is_day:1},
  daily:{temperature_2m_max:[28.2,27],temperature_2m_min:[14.1,13],sunrise:["2026-09-23T08:04","2026-09-24T08:05"],sunset:["2026-09-23T20:13","2026-09-24T20:11"],precipitation_probability_max:[5,0]}};
const fakeWeather=(delay=0)=>async p=>{
  await p.route("https://api.open-meteo.com/**",async r=>{
    if(delay) await new Promise(x=>setTimeout(x,delay));
    await r.fulfill({status:200,contentType:"application/json",body:JSON.stringify(WEATHER)}).catch(()=>{});   /* (the page may be gone) */
  });
};
const FAKE_CONFIG=()=>{ Object.defineProperty(window,"CONFIG",{value:{BIN_ID:"test",API_KEY:"test"},writable:false}); };

(async()=>{
  /* if this Playwright version has no browser of its own, the system Chromium is used */
  const b=await chromium.launch().catch(()=>chromium.launch({executablePath:process.env.CHROMIUM||"/opt/pw-browsers/chromium"}));

  section("Loading");
  for(const mobile of [false,true]){
    const p=await open(b,{mobile});
    const r=await p.evaluate(()=>({width:document.documentElement.scrollWidth,errors:CHECK.errors,warnings:CHECK.warnings.length,
      banner:!document.getElementById("errorBanner").hidden}));
    ok(!p.errors.length,`${mobile?"mobile":"desktop"}: no JavaScript errors ${p.errors.join(" | ")}`);
    ok(!r.errors.length&&!r.banner,`${mobile?"mobile":"desktop"}: data without errors ${r.errors.join(" | ")}`);
    ok(await p.evaluate(()=>!document.documentElement.hasAttribute("data-booting")&&getComputedStyle(document.getElementById("portal")).visibility==="visible"),
      `${mobile?"mobile":"desktop"}: once the first view is chosen the page shows (data-booting is gone)`);
    if(mobile) ok(r.width<=390,`mobile: nothing sticks out of the screen (${r.width}px)`);
    if(r.warnings) console.log(`    (the checker leaves ${r.warnings} warnings in the console)`);
    await p.context().close();
  }

  section("PIN and start");
  {
    const p=await open(b,{locked:true,mobile:true});
    ok(await p.evaluate(()=>document.documentElement.hasAttribute("data-locked")&&!document.getElementById("gate").hidden
      &&getComputedStyle(document.querySelector("body > div.wrap")).visibility==="hidden"),"a new device sees only the entry screen");
    ok(await p.evaluate(()=>document.getElementById("gatePad").hidden&&!document.getElementById("gateStart").hidden&&!!document.getElementById("gateGuest").offsetWidth),
      "at first: Nolan's logo and the guest button, no keypad");
    ok(!p.requests.some(u=>/jsonbin/.test(u)),"behind the entry screen nothing is read from the cloud");
    await p.click("#gateLogo"); await p.waitForTimeout(200);
    ok(await p.evaluate(()=>!document.getElementById("gatePad").hidden&&document.getElementById("gateStart").hidden&&document.getElementById("gateLogo").getAttribute("aria-expanded")==="true"),
      "the logo opens the PIN keypad");
    for(const k of WRONG) await p.click(`#gate [data-k="${k}"]`);
    await p.waitForTimeout(1200);
    ok(pinHash(WRONG)!==DEVICE&&await p.evaluate(()=>document.documentElement.hasAttribute("data-locked")&&/incorrecto/.test(document.getElementById("gateMsg").textContent)),"a wrong PIN keeps it locked");
    /* (a NOLAN_PIN that is not the PIN would make the checks below fail for the wrong reason: said here, and not typed) */
    if(PIN) ok(PIN_OK,"NOLAN_PIN is the PIN (its hash is the one in gate.js)");
    if(PIN_OK){
      for(const k of PIN) await p.click(`#gate [data-k="${k}"]`);
      await p.waitForTimeout(2500);
      ok(await p.evaluate(()=>Universe.busy()&&Universe.scene()==="home"&&document.getElementById("gate").classList.contains("leaving")),"the keypad drifts away and the camera flies into the home galaxy");
      /* (a slow software graphics card stretches the flight: wait for it to land, not a fixed time) */
      await p.waitForFunction(()=>!document.documentElement.hasAttribute("data-locked")&&!Universe.busy(),null,{timeout:20000}).catch(()=>{});
      const r=await p.evaluate(()=>({locked:document.documentElement.hasAttribute("data-locked"),saved:localStorage.getItem("nolan-device"),
        home:!document.getElementById("portal").hidden,canvas:Universe.busy()}));
      ok(!r.locked&&r.saved&&r.home&&!r.canvas,"the right PIN opens it, lands on home and the device remembers it");
    } else {
      skip("the keypad drifts away and the camera flies into the home galaxy");
      skip("the right PIN opens it, lands on home and the device remembers it");
      /* what a device that typed the right PIN keeps, so the checks below still run */
      await p.evaluate(k=>localStorage.setItem("nolan-device",k),DEVICE);
    }
    await p.evaluate(()=>sessionStorage.setItem("keep","1"));
    await p.reload(); await p.waitForTimeout(600);
    ok(await p.evaluate(()=>!document.documentElement.hasAttribute("data-locked")&&document.getElementById("gate").hidden),"the same device is not asked again");
    /* no six digits in the page are the PIN: compared with it when it is given, else hashed as gate.js does */
    const html=await p.content();
    if(PIN_OK) ok(!html.includes(PIN),"the PIN itself is nowhere in the page");
    else {
      const six=new Set();
      for(const run of html.match(/\d{6,}/g)||[]) for(let i=0;i+6<=run.length;i++) six.add(run.slice(i,i+6));
      ok(![...six].some(k=>pinHash(k)===DEVICE),`the PIN itself is nowhere in the page (${six.size} runs of six digits hashed)`);
    }
    await p.goto(PAGE+"#settings"); await p.waitForTimeout(500);
    await p.click("#logout"); await p.waitForTimeout(400);
    ok(await p.evaluate(()=>document.documentElement.hasAttribute("data-locked")&&!document.getElementById("gate").hidden&&!localStorage.getItem("nolan-device")
      &&document.getElementById("gatePad").hidden),
      "Log out (in Settings) forgets the device and shows the entry screen again");
    await p.keyboard.press("7"); await p.waitForTimeout(150);
    ok(await p.evaluate(()=>!document.getElementById("gatePad").hidden&&document.querySelectorAll("#gate .g-dot.on").length===1),"typing a digit on a keyboard opens the keypad too");
    await p.keyboard.press("Backspace");
    if(PIN_OK){
      for(const k of PIN) await p.click(`#gate [data-k="${k}"]`);
      await p.waitForFunction(()=>!document.documentElement.hasAttribute("data-locked")&&!Universe.busy(),null,{timeout:20000}).catch(()=>{});
      ok(await p.evaluate(()=>!document.documentElement.hasAttribute("data-locked")&&location.hash==="#home"&&!document.querySelector('#portal .p-view[data-view="home"]').hidden),
        "after logging out from Settings, the PIN lands on home again");
    } else skip("after logging out from Settings, the PIN lands on home again");
    await p.context().close();
  }
  {
    const p=await open(b);
    ok(await p.evaluate(()=>!document.getElementById("portal").hidden),"the app starts at home");
    await p.waitForTimeout(3500); await p.click("#homeUc3m"); await p.waitForTimeout(1200);
    ok(await p.evaluate(()=>Universe.busy()&&Universe.scene()==="uc3m"),"UC3M: the camera flies to the UC3M galaxy");
    /* (a slow software graphics card can stretch the flight: wait for it to land, not a fixed time) */
    await p.waitForFunction(()=>document.getElementById("portal").hidden&&!Universe.busy(),null,{timeout:10000}).catch(()=>{});
    ok(await p.evaluate(()=>document.getElementById("portal").hidden&&location.hash==="#schedule"&&!Universe.busy()&&Universe.scene()==="uc3m"),
      "…and lands on the timetable, inside that galaxy");
    await p.click('header a[href="#notes"]'); await p.waitForTimeout(600);
    ok(await p.evaluate(()=>Universe.scene()==="uc3m"&&!document.getElementById("notes").hidden&&document.querySelector("#notes .p-back-top").getAttribute("href")==="#schedule"),
      "Notes open from UC3M without leaving its galaxy, and Back returns to the timetable");
    await p.click("#notes .p-back-top"); await p.waitForTimeout(600);
    await p.click("header .home-btn"); await p.waitForTimeout(3200);
    /* what the second click does is noted in the page itself, right after it (a slow software graphics card
       makes every evaluate late): the timetable is on its way in, while the camera, on its way from home (c0)
       to UC3M (c1), still has most of the trip ahead (left: the share of the way still to go) */
    await p.evaluate(()=>{ const P=document.getElementById("portal"); let n=0; window.__c0=Universe.camera(); window.__skip=null;
      addEventListener("click",()=>{ if(++n!==2) return; const cam=Universe.camera();
        setTimeout(()=>{ window.__skip={cam,busy:Universe.busy(),scene:Universe.scene(),hash:location.hash,going:P.hidden||P.classList.contains("leaving")}; },0); },true); });
    await p.click("#homeUc3m"); await p.waitForTimeout(250); await p.mouse.click(640,450);
    /* (home fades out in 280 ms; a slow software graphics card can delay that timer, so wait for it) */
    await p.waitForFunction(()=>document.getElementById("portal").hidden,null,{timeout:4000}).catch(()=>{});
    const shown=await p.evaluate(()=>document.getElementById("portal").hidden&&location.hash==="#schedule");
    await p.waitForFunction(()=>!Universe.busy(),null,{timeout:10000}).catch(()=>{});
    const sk=await p.evaluate(()=>{ const h=window.__skip, c0=window.__c0, c1=Universe.camera(), d=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);
      return h&&{busy:h.busy,scene:h.scene,hash:h.hash,going:h.going,left:+(d(h.cam,c1)/Math.max(1e-6,d(c0,c1))).toFixed(2)}; });
    ok(shown&&!!sk&&sk.hash==="#schedule"&&sk.going&&sk.busy&&sk.scene==="uc3m"&&sk.left>.3,
      `a second click during the trip shows the timetable at once, while the camera flies on (the sky never jumps) (${JSON.stringify(sk)})`);
    await p.click("header .home-btn"); await p.waitForTimeout(200);
    ok(await p.evaluate(()=>Universe.scene()==="home"&&!!document.querySelector("header .home-btn .logo-mark")),"the logo takes you home, flying back to the home galaxy");
    await p.waitForTimeout(2800);
    /* the journey: home's big button flies to the Earth and starts the tour */
    await p.click("#tourStart"); await p.waitForFunction(()=>location.hash==="#earth"&&!Universe.busy(),null,{timeout:15000}).catch(()=>{});
    const st=await p.evaluate(()=>({scene:Universe.scene(),view:!document.getElementById("sightView").hidden,tour:!document.getElementById("tour").hidden,
      stops:document.querySelectorAll("#tourList .t-stop").length,
      here:(document.querySelector("#tourList .t-stop[aria-current]")||{dataset:{}}).dataset.sight,arrows:!!document.querySelector(".s-arrow,#placeMenu")}));
    ok(st.scene==="earth"&&st.view&&st.tour&&st.stops===11&&st.here==="earth"&&!st.arrows,
      `"Start the journey" flies to the Earth and starts the tour: the dock holds the eleven places, no arrows at the screen's edges (${JSON.stringify(st)})`);
    /* choosing where to go: any place in the dock (clicked as soon as the camera stops: it must answer) */
    await p.waitForTimeout(800);                      /* (the dock has slid into place) */
    const at=await p.evaluate(()=>{ const r=document.getElementById("tour").getBoundingClientRect(); return [Math.round(r.x),Math.round(r.y)]; });
    await p.click('#tourList .t-stop[data-sight="orion"]'); await p.waitForFunction(()=>location.hash==="#orion"&&!Universe.busy(),null,{timeout:15000}).catch(()=>{});
    const nx=await p.evaluate(()=>({scene:Universe.scene(),h:document.querySelector("#sightView h2").textContent,here:(document.querySelector("#tourList .t-stop[aria-current]")||{dataset:{}}).dataset.sight}));
    const at2=await p.evaluate(()=>{ const r=document.getElementById("tour").getBoundingClientRect(); return [Math.round(r.x),Math.round(r.y)]; });
    ok(nx.scene==="orion"&&/Orión/.test(nx.h)&&nx.here==="orion",`a place chosen in the dock flies there, says what it is and is lit in the dock (${JSON.stringify(nx)})`);
    ok(at.join()===at2.join(),`the dock stays in the same place from one sight to the next (${at} ${at2})`);
    /* its arrows: the next one, and nothing moves on by itself */
    await p.click('#tour .t-arrow[data-dir="next"]');
    await p.waitForFunction(()=>location.hash==="#pleiades"&&!Universe.busy(),null,{timeout:15000}).catch(()=>{});
    const on=await p.evaluate(()=>({hash:location.hash,h:document.querySelector("#sightView h2").textContent,prev:document.querySelector('#tour .t-arrow[data-dir="prev"]').getAttribute("href"),auto:!!document.getElementById("tourAuto")}));
    ok(on.hash==="#pleiades"&&/Pléyades/.test(on.h)&&on.prev==="#orion"&&!on.auto,`the dock's arrows go to the next and the one before; no timed autopilot (${JSON.stringify(on)})`);
    /* the keys on their own: from the Pleiades, once everything has settled */
    if(await p.evaluate(()=>location.hash!=="#pleiades")){ await p.evaluate(()=>{ location.hash="#pleiades"; }); await p.waitForFunction(()=>location.hash==="#pleiades"&&!Universe.busy(),null,{timeout:15000}).catch(()=>{}); }
    await p.waitForTimeout(1500);
    await p.keyboard.press("ArrowLeft"); await p.waitForFunction(()=>location.hash==="#orion"&&!Universe.busy(),null,{timeout:15000}).catch(()=>{});
    const back=await p.evaluate(()=>Universe.scene());
    await p.waitForTimeout(1500);
    await p.keyboard.press("ArrowRight"); await p.waitForFunction(()=>location.hash==="#pleiades"&&!Universe.busy(),null,{timeout:15000}).catch(()=>{});
    const fwd=await p.evaluate(()=>Universe.scene());
    ok(back==="orion"&&fwd==="pleiades",`and the arrow keys go back and forth (${back}, ${fwd})`);
    /* Escape (and the phone's Back) walk back the way you came: Orion before the Pleiades, and so on to home */
    /* (Back is asynchronous: wait for the camera to be there, not only the address) */
    await p.keyboard.press("Escape"); await p.waitForFunction(()=>location.hash==="#orion"&&Universe.scene()==="orion"&&!Universe.busy(),null,{timeout:15000}).catch(()=>{});
    const esc=await p.evaluate(()=>({hash:location.hash,scene:Universe.scene(),h:(document.querySelector("#sightView h2")||{}).textContent,open:!document.getElementById("portal").hidden}));
    ok(esc.hash==="#orion"&&esc.scene==="orion"&&/Orión/.test(esc.h)&&esc.open,`Escape goes back to the place before, flying there (${JSON.stringify(esc)})`);
    await p.goBack(); await p.waitForFunction(()=>location.hash==="#pleiades"&&Universe.scene()==="pleiades"&&!Universe.busy(),null,{timeout:15000}).catch(()=>{});
    ok(await p.evaluate(()=>location.hash==="#pleiades"&&Universe.scene()==="pleiades"&&!document.getElementById("portal").hidden),"and Back walks the same way (the phone's Back does not leave the site)");
    await p.goto(PAGE+"#soon/andromeda"); await p.waitForTimeout(500);
    ok(await p.evaluate(()=>location.hash==="#ringgalaxy"&&!document.body.textContent.includes("Andrómeda")&&!document.body.textContent.includes("Sombrero")),
      "no more Andrómeda or Sombrero cards: their galaxies are sights, and the old links fly to them");
    await p.goto(PAGE+"#notes"); await p.waitForTimeout(500);
    ok(await p.evaluate(()=>!document.getElementById("portal").hidden&&!document.getElementById("notes").hidden&&!!document.querySelector("#portal #notesText")),"Notes open inside home");
    await p.goto(PAGE+"#ajustes"); await p.waitForTimeout(500);
    ok(await p.evaluate(()=>!document.getElementById("portal").hidden&&!document.getElementById("settings").hidden&&location.hash==="#settings"),"Settings open inside home (old links too)");
    await p.context().close();
  }
  {
    /* on a phone home's content spans the whole width: it must not cover Notes and Settings */
    const p=await open(b,{hash:"orion",mobile:true});
    const onTop=await p.evaluate(()=>[...document.querySelectorAll("#portal .p-tool")].every(a=>{
      const r=a.getBoundingClientRect(), hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);
      return r.width>0&&a.contains(hit);
    }));
    await p.tap("#portal .p-tool.gear-btn"); await p.waitForTimeout(400);
    ok(onTop&&await p.evaluate(()=>location.hash==="#settings"&&!document.getElementById("settings").hidden),
      "mobile: on a sight, Notes and Settings can be tapped");
    await p.context().close();
  }
  for(const [width,height,mobile] of [[1280,900,false],[390,844,true],[360,740,true],[844,390,true]]){
    /* every sight is seen whole: in the middle of the screen, above its words, as big as the screen allows */
    const p=await open(b,{hash:"home",mobile,viewport:{width,height}});
    await p.waitForFunction(()=>Universe.ready()&&window.UNIVERSE_EXTRAS.every(x=>x.ready||x.broken),null,{timeout:60000}).catch(()=>{});
    const bad=[];
    for(const id of await p.evaluate(()=>Home.sights())){
      await p.evaluate(h=>{ location.hash="#"+h; },id);
      await p.waitForFunction(h=>location.hash==="#"+h&&!Universe.busy(),id,{timeout:20000}).catch(()=>{});
      const v=await p.evaluate(h=>{ const pl=Universe.place(h), words=document.querySelector("#sightView .s-fact").getBoundingClientRect();
        return {scene:Universe.scene(),h:document.querySelector("#sightView h2").textContent,pl,words:Math.round(words.top)}; },id);
      const pl=v.pl;
      if(v.scene!==id||!v.h||!pl||Math.abs(pl.x-width/2)>width*.12||pl.y-pl.r*.6<0||pl.y>v.words||pl.r<Math.min(width,height)*.12) bad.push(id+" "+JSON.stringify(v));
    }
    ok(!bad.length&&!p.errors.length,`${width}×${height}: every sight is framed whole, above its words ${bad.join(" | ")} ${p.errors.join(" | ")}`);
    await p.context().close();
  }
  for(const mobile of [false,true]){
    const p=await open(b,{hash:"home",mobile});
    await p.waitForFunction(()=>Universe.ready(),null,{timeout:20000}).catch(()=>{});
    const seen=await p.evaluate(()=>!Universe.gl()||Universe.hole());
    ok(seen&&!p.errors.length,`${mobile?"mobile":"desktop"}: the black hole is in the sky of home ${p.errors.join(" | ")}`);
    /* its own window: the camera flies up close, the text sits below it */
    await p.evaluate(()=>{ location.hash="#blackhole"; });
    await p.waitForFunction(()=>location.hash==="#blackhole"&&!Universe.busy(),null,{timeout:12000}).catch(()=>{});
    const r=await p.evaluate(()=>({scene:Universe.scene(),hash:location.hash,view:!document.getElementById("sightView").hidden,
      top:getComputedStyle(document.querySelector("#portal .p-top")).display,seen:!Universe.gl()||Universe.hole()}));
    ok(r.scene==="blackhole"&&r.hash==="#blackhole"&&r.view&&r.top==="none"&&r.seen,`${mobile?"mobile":"desktop"}: the black hole card flies up close to it (${JSON.stringify(r)})`);
    await p.click("#tour .t-exit"); await p.waitForTimeout(3200);
    ok(await p.evaluate(()=>Universe.scene()==="home"&&location.hash==="#home"),`${mobile?"mobile":"desktop"}: and back home`);
    await p.context().close();
  }

  section("Tabs");
  {
    const p=await open(b,{hash:"schedule"});
    for(const tab of ["subjects","exams","tasks","faculty","schedule"]){
      await p.click(`nav.bar a[data-tab=${tab}]`); await p.waitForTimeout(1000);
      const r=await p.evaluate(()=>{ const on=document.querySelector("a[data-tab].on"), i=document.querySelector(".tab-pill").getBoundingClientRect(), a=on.getBoundingClientRect();
        return {tab:on.dataset.tab,dx:Math.abs(i.left-a.left),cur:on.getAttribute("aria-current")}; });
      ok(r.tab===tab&&r.dx<2&&r.cur==="page",`${tab}: active, with the pill on top and aria-current (${r.dx.toFixed(1)}px)`);
    }
    await p.goto(PAGE+"#asignaturas"); await p.waitForTimeout(500);
    ok(await p.evaluate(()=>location.hash==="#subjects"&&!document.getElementById("subjects").hidden),"old Spanish links (#asignaturas) still work");
    await p.context().close();
  }

  section("Today: red line and live status (Monday 21 Sep)");
  for(const [time,mode,text] of [["08:12","pinned-top","empiezas en 48 min"],["10:36","","siguiente en 9 min"],["13:06","","quedan 54 min"],["16:40","pinned-bottom","día de clase terminado"]]){
    const p=await open(b,{time:"2026-09-21T"+time+":00"});
    const r=await p.evaluate(()=>({live:document.getElementById("dayLive").textContent,cls:(document.querySelector(".now-line")||{}).className}));
    ok(r.live===text&&r.cls==="now-line"+(mode?" "+mode:""),`${time}: "${r.live}" (${r.cls})`);
    await p.context().close();
  }
  {
    const p=await open(b,{time:"2026-09-21T13:06:00"});
    ok(await p.evaluate(()=>!document.querySelector("#dayList .trow i, #dayList .trow u")),"the class rows have no progress bar");
    await p.context().close();
  }
  {
    const p=await open(b,{time:"2026-09-21T12:28:50",clock:"live",hash:"schedule"});
    await p.evaluate(()=>{ window.__line=document.querySelector(".now-line"); });
    await p.clock.runFor(72000);
    const r=await p.evaluate(()=>[document.querySelector("#clockTime").textContent.replace(/\s/g,""),document.getElementById("dayLive").textContent,document.querySelectorAll(".trow.now").length]);
    ok(r[0]==="12:30"&&r[1]==="quedan 1 h 30 min"&&r[2]===1,`when the minute changes everything updates together (${r.join(" · ")})`);
    ok(await p.evaluate(()=>!!window.__line&&window.__line===document.querySelector(".now-line")&&!window.__line.getAnimations().length),
      "the red line moves in place: a new minute never makes it fade in again");
    await p.clock.setSystemTime(new Date("2026-09-21T23:59:50")); await p.clock.runFor(61000);
    ok(/Martes, 22/.test(await p.textContent("#dayTitle")),"at midnight Today moves to the next day");
    await p.context().close();
  }
  {
    const p=await open(b,{time:"2026-12-01T08:00:00"});
    const r=await p.evaluate(()=>document.getElementById("next7").textContent);
    ok(/semana 13/.test(r)&&!/en 4 días/.test(r),"dates without a confirmed day show as \"semana N\", without a countdown");
    await p.context().close();
    const q=await open(b,{time:"2026-10-27T10:00:00"});
    ok(/cierra el sábado/.test(await q.textContent("#next7")),"a window of several days stays visible while it is open");
    await q.context().close();
  }

  section("Cloud (simulated JSONBin)");
  const REC={hechas:["gk_0","tk_is_0"],grades:{g_main_ed_0:"7"},notas:"old notes"};
  for(const mode of ["fails","slow","normal"]){
    const writes=[];
    const p=await open(b,{hash:"tasks",routes:fakeCloud(REC,mode,writes),before:FAKE_CONFIG});
    await p.locator("#generalTasks input").nth(2).check();
    await p.waitForTimeout(5000);
    const u=writes[writes.length-1]||{};
    ok(u.notas==="old notes"&&(u.hechas||[]).length===3&&u.grades&&u.grades["g_main_ed_parcial-1"]==="7",
      `first read ${mode}: nothing is lost and old ids are translated (${(u.hechas||[]).length} ticks)`);
    await p.context().close();
  }
  {
    const writes=[];
    const p=await open(b,{hash:"notes",routes:fakeCloud(REC,"fails",writes),before:FAKE_CONFIG});
    ok(await p.evaluate(()=>document.getElementById("notesText").readOnly),"notes cannot be typed until the saved ones arrive");
    await p.waitForTimeout(3000);
    ok(await p.inputValue("#notesText")==="old notes","after retrying the saved notes appear");
    await p.goto(PAGE+"#subjects"); await p.waitForTimeout(2500);
    const inp=p.locator('.g-input[data-scope=main][data-subj=ed]').nth(1);
    await inp.fill("7,5"); await inp.press("Tab"); await p.waitForTimeout(1500);
    ok(/Acumulado: 3.63/.test(await p.textContent("#res-main-ed")),"a grade with a comma (7,5) counts as 7.5");
    await p.context().close();
  }

  {
    /* the copy kept on this device shows at once: ticks do not pop in when the cloud answers */
    const writes=[];
    const p=await open(b,{hash:"tasks",routes:fakeCloud(REC,"slow",writes),before:()=>{ Object.defineProperty(window,"CONFIG",{value:{BIN_ID:"test",API_KEY:"test"},writable:false});
      localStorage.setItem("nolan-cloud",JSON.stringify({hechas:[],grades:{},notas:"old"}));
      /* every pop of a tick, whoever made it */
      window.__pops=[]; addEventListener("animationstart",e=>{ if(e.target.matches&&e.target.matches(".checkitem input")) window.__pops.push(e.target.id); },true); }});
    const r=await p.evaluate(()=>({notes:document.getElementById("notesText").value,ro:document.getElementById("notesText").readOnly}));
    ok(r.notes==="old"&&r.ro,`before the cloud answers, this device's copy is already on screen (notes read-only until then) (${JSON.stringify(r)})`);
    await p.waitForTimeout(3500);
    const f=await p.evaluate(()=>({ro:document.getElementById("notesText").readOnly,ticks:document.querySelectorAll("#subjectTasks input:checked, #generalTasks input:checked").length,
      pops:window.__pops,on:document.querySelectorAll("#tasksConstellation .c-star.on").length,born:document.querySelectorAll("#tasksConstellation .c-star.fresh").length}));
    ok(!f.ro&&f.ticks===2&&!f.pops.length&&f.on===2&&!f.born,`then the fresh copy takes over: its ticks arrive without popping and no star is born by itself (${JSON.stringify(f)})`);
    await p.locator("#generalTasks input:not(:checked)").first().check(); await p.waitForTimeout(100);
    const u=await p.evaluate(()=>({pops:window.__pops.length,born:document.querySelectorAll("#tasksConstellation .c-star.fresh").length}));
    ok(u.pops===1&&u.born===1,`a tick of your own pops, and its star is born (${JSON.stringify(u)})`);
    await p.context().close();
  }

  section("Planner");
  {
    const p=await open(b,{hash:"planner",time:"2026-10-20T10:00:00"});
    const r=await p.evaluate(()=>({opens:document.querySelectorAll("#planner-grid .m-chip.opens").length,
      closes:document.querySelectorAll("#planner-grid .m-chip.closing").length,links:document.querySelectorAll("#planner-grid .m-link").length}));
    ok(r.opens===1&&r.closes===1&&r.links===4,`a window of several days (26–31 Oct) is joined by a line (${r.links} days in between)`);
    await p.context().close();
  }

  section("Add to my calendar (.ics)");
  {
    const p=await open(b,{hash:"exams"});
    const ics=await p.evaluate(()=>buildICS(icsEvents(),new Date("2026-09-21T11:06:00Z")));
    const r=await p.evaluate(()=>({n:icsEvents().length,
      want:EVENTS.filter(e=>(e.type==="ex"||e.type==="en")&&!e.noDay).length,
      noDay:EVENTS.some(e=>e.noDay&&icsEvents().includes(e))}));
    const lines=ics.split("\r\n");
    ok(/^BEGIN:VCALENDAR\r\n/.test(ics)&&/END:VCALENDAR\r\n$/.test(ics)&&!/[^\r]\n/.test(ics),"a well-formed calendar with CRLF line endings");
    ok(r.n===r.want&&!r.noDay&&(ics.match(/BEGIN:VEVENT/g)||[]).length===r.n,`every exam and submission with a day, none without one (${r.n})`);
    ok(lines.every(l=>new TextEncoder().encode(l).length<=75),"no line is longer than 75 bytes");
    const unfolded=ics.replace(/\r\n /g,"");
    ok(/DTSTART;TZID=Europe\/Madrid:20261015T090000\r\nDTEND;TZID=Europe\/Madrid:20261015T103000/.test(unfolded)&&/BEGIN:VTIMEZONE\r\nTZID:Europe\/Madrid/.test(ics),
      "a timed exam keeps its Madrid time (ED, 15 Oct 09:00–10:30)");
    ok(/DTSTART;VALUE=DATE:20261026\r\nDTEND;VALUE=DATE:20261101/.test(unfolded)&&/TRIGGER;RELATED=END:-P1D/.test(ics),
      "a window of several days is all-day, 26–31 Oct, and warns before it closes");
    ok(/LOCATION:Aula 2\.3\.C01 · Getafe|LOCATION:Aula 2\.3\.C01 · Leganés/.test(unfolded)&&/SUMMARY:Examen · [^\r]+Primer parcial: bloque 1/.test(unfolded),
      "room with its campus, and the title, are there");
    ok(!/[^\\],/.test(unfolded.split("\r\n").filter(l=>/^(SUMMARY|DESCRIPTION|LOCATION):/.test(l)).join("\n")),"commas in texts are escaped");
    const text=await p.textContent("#icsNote");
    ok(/\d+ exámenes y entregas/.test(text)&&/sin día confirmado/.test(text),`the note says how many go in and how many wait for a day ("${text}")`);
    const [dl]=await Promise.all([p.waitForEvent("download",{timeout:3000}).catch(()=>null),p.click("#icsButton")]);
    ok(dl&&dl.suggestedFilename()==="nolan-uc3m.ics","the button downloads nolan-uc3m.ics");
    ok(!p.errors.length,`no JavaScript errors ${p.errors.join(" | ")}`);
    await p.context().close();
  }

  section("Home");
  {
    const p=await open(b,{hash:"subjects"});
    /* (once the universe has finished starting: a software graphics card compiles the wonders one by one, and
       each compile holds the page for a moment, timers too; a real one compiles them alongside) */
    await p.waitForFunction(()=>Universe.ready()&&window.UNIVERSE_EXTRAS.every(x=>x.ready||x.broken),null,{timeout:60000}).catch(()=>{});
    await p.click(".home-btn"); await p.waitForTimeout(400);
    ok(await p.evaluate(()=>!document.getElementById("portal").hidden&&document.querySelector("nav.bar").inert),"the home button opens the window and blocks what is behind");
    ok(await p.evaluate(()=>{ const w=getComputedStyle(document.querySelector("body > div.wrap"));
      return w.visibility==="hidden"&&w.opacity==="0"&&w.contentVisibility==="hidden"; }),"while home is open, the page behind is not drawn at all (no lines of its tables through home)");
    await p.keyboard.press("Escape");
    /* (home fades out in 280 ms; under the whole suite a software graphics card has held that timer back up to ~11 s) */
    await p.waitForFunction(()=>document.getElementById("portal").hidden,null,{timeout:15000}).catch(()=>{});
    ok(await p.evaluate(()=>document.getElementById("portal").hidden&&location.hash==="#subjects"),"Escape closes it and you are back on the same tab");
    /* just the sky: the interface hides, the way back stays, Escape returns */
    await p.click('header [data-view-sky]'); await p.waitForTimeout(300);
    await p.waitForFunction(()=>getComputedStyle(document.querySelector("body > div.wrap")).opacity==="0",null,{timeout:3000}).catch(()=>{});
    const v=await p.evaluate(()=>({on:document.documentElement.classList.contains("viewing"),exit:!document.getElementById("viewExit").hidden,
      page:getComputedStyle(document.querySelector("body > div.wrap")).opacity,header:getComputedStyle(document.querySelector("header.top")).pointerEvents}));
    await p.keyboard.press("Escape"); await p.waitForTimeout(800);
    const back=await p.evaluate(()=>!document.documentElement.classList.contains("viewing")&&document.getElementById("viewExit").hidden
      &&getComputedStyle(document.querySelector("body > div.wrap")).opacity==="1"&&location.hash==="#subjects");
    ok(v.on&&v.exit&&v.page==="0"&&v.header==="none"&&back,`the eye button shows just the sky, and Escape brings everything back (${JSON.stringify(v)})`);
    await p.goto(PAGE+"#nolan"); await p.waitForTimeout(600);
    const n=await p.evaluate(()=>({shown:!document.getElementById("nolanView").hidden,month:!!document.querySelector("#nolan-grid .m-grid.days"),
      other:document.querySelectorAll("#nolan-grid .m-chip:not(.ex):not(.personal)").length}));
    ok(n.shown&&n.month&&n.other===0,`#nolan opens Nolan's month calendar, with only exams and his own plans (${JSON.stringify(n)})`);
    await p.context().close();
  }

  for(const mobile of [false,true]){
    /* the first screen of home is the hero alone; where to go is further down */
    const p=await open(b,{hash:"home",mobile});
    const r=await p.evaluate(()=>{ const list=document.querySelector('#portal .p-view[data-view="home"]'), top=document.querySelector("#portal .p-top").getBoundingClientRect();
      return {list:Math.round(list.getBoundingClientRect().top),h:innerHeight,hero:Math.round(top.bottom),more:!!document.getElementById("homeMore").offsetWidth,
        sights:document.querySelectorAll("#tourList .t-stop").length,menu:document.getElementById("tour").hidden,start:!!document.getElementById("tourStart").offsetWidth}; });
    await p.click("#homeMore"); await p.waitForTimeout(900);
    const after=await p.evaluate(()=>{ const r=document.querySelector("#homeUc3m").getBoundingClientRect(); return r.top>=0&&r.top<innerHeight; });
    ok(r.list>=r.h&&r.more&&r.sights===11&&r.menu&&r.start&&after,`${mobile?"mobile":"desktop"}: home's first screen is only the hero; "Start the journey" (eleven places) and the sections come when you scroll (${JSON.stringify(r)})`);
    await p.context().close();
  }
  {
    /* the opening plays once: when it ends, nothing on home fades out and in again */
    const p=await open(b,{hash:"home"});
    await p.evaluate(()=>{ document.getElementById("portal").classList.add("intro"); });
    await p.waitForTimeout(300);
    const v=await p.evaluate(()=>{ document.getElementById("portal").classList.remove("intro");
      return document.querySelector('#portal .p-view[data-view="home"]').getAnimations().filter(a=>a.playState==="running"&&a.currentTime<200).length; });
    ok(v===0,"when the opening ends, home's cards do not blink");
    await p.context().close();
  }

  {
    /* English is the site's language unless Spanish is chosen */
    const ctx=await b.newContext({viewport:{width:1280,height:900}}); const p=await ctx.newPage();
    await p.route(/fonts\.(googleapis|gstatic)\.com|jsonbin|open-meteo|bigdatacloud/,r=>r.abort());
    await p.addInitScript(k=>localStorage.setItem("nolan-device",k),DEVICE);
    await p.goto(PAGE+"#schedule",{waitUntil:"load"}); await p.waitForTimeout(300);
    ok(await p.evaluate(()=>document.documentElement.lang==="en"&&document.querySelector("a[data-tab=schedule] .tab-label").textContent==="Schedule"),"English by default");
    await ctx.close();
  }

  section("Guest");
  {
    /* a link with ?guest (to share) opens the demo straight away, without the entry screen */
    const p=await open(b,{locked:true,hash:"home",path:"?guest"});
    const r=await p.evaluate(()=>({guest:document.documentElement.hasAttribute("data-guest"),locked:document.documentElement.hasAttribute("data-locked"),demo:typeof SUBJECTS!=="undefined"&&!!SUBJECTS.alg}));
    ok(r.guest&&!r.locked&&r.demo,`a ?guest link opens the demo organizer at once (${JSON.stringify(r)})`);
    await p.context().close();
  }
  {
    const writes=[];
    /* (the browser would tell where the device is: a guest must not ask) */
    const p=await open(b,{locked:true,time:"2026-09-23T16:05:00",before:FAKE_CONFIG,routes:async p=>{
      await fakeCloud({hechas:["gk_0"],notas:"private"},"normal",writes)(p); await fakeWeather()(p);
      await p.context().grantPermissions(["geolocation"]); await p.context().setGeolocation({latitude:48.857,longitude:2.352}); }});
    /* the guest button: the page loads again with the demo organizer, and flies in */
    p.requests.length=0;                                  /* (what the entry screen itself loaded does not count) */
    await Promise.all([p.waitForNavigation({waitUntil:"load"}),p.click("#gateGuest")]);
    /* (the page loads again: home opens once it has started, which a slow software graphics card stretches) */
    await p.waitForFunction(()=>!document.getElementById("portal").hidden&&!Universe.busy(),null,{timeout:20000}).catch(()=>{});
    const r=await p.evaluate(()=>({guest:document.documentElement.hasAttribute("data-guest"),home:!document.getElementById("portal").hidden,
      greeting:document.getElementById("homeGreeting").textContent,demo:!!SUBJECTS.alg&&!SUBJECTS.ed,card:document.querySelector("#homeUc3m b").textContent,
      nolan:getComputedStyle(document.querySelector("#portal .p-card.wip")).display,notes:getComputedStyle(document.querySelector('#portal .p-tool[href="#notes"]')).display,
      explore:getComputedStyle(document.getElementById("tourStart")).display,device:localStorage.getItem("nolan-device"),errors:CHECK.errors.length,warnings:CHECK.warnings.length}));
    r.cloud=p.requests.filter(u=>/jsonbin/.test(u)).length;
    r.files=p.requests.filter(u=>/\/(data|eval|config|demo)\.js/.test(u)).map(u=>u.replace(/^.*\//,"").replace(/\?.*/,""));
    await p.waitForFunction(()=>/24°/.test(document.getElementById("homeWeather").textContent),null,{timeout:5000}).catch(()=>{});
    const w=await p.evaluate(()=>({text:document.getElementById("homeWeather").textContent,kept:localStorage.getItem("weather")}));
    w.located=p.requests.some(u=>/bigdatacloud|latitude=48\.857/.test(u));
    ok(/24°/.test(w.text)&&/Getafe/.test(w.text)&&!w.kept&&!w.located,`a guest sees the weather of Getafe, without the device's location, and it is not kept (${JSON.stringify(w)})`);
    ok(r.guest&&r.home&&/invitado/.test(r.greeting)&&r.demo&&r.card==="Universidad"&&r.nolan==="none"&&r.notes==="none"&&r.explore!=="none"&&!r.cloud&&!r.device&&!r.errors&&!r.warnings
      &&r.files.join()==="demo.js",
      `the guest button opens the same site with a demo organizer: demo.js only (not Nolan's data or the cloud's key), nothing read from the cloud (${JSON.stringify(r)})`);
    await p.goto(PAGE+"#schedule");
    await p.waitForFunction(()=>document.getElementById("portal").hidden,null,{timeout:3000}).catch(()=>{});   /* (home fades out: 280 ms, stretched under load) */
    const app=await p.evaluate(()=>({hash:location.hash,brand:document.querySelector("header .brand").textContent,rows:document.querySelectorAll("#calbody .ev").length,
      ag:getComputedStyle(document.querySelector(".ag-btn")).display,portal:document.getElementById("portal").hidden}));
    const routes={};
    for(const h of ["notes","nolan"]){ await p.goto(PAGE+"#"+h); await p.waitForTimeout(300); routes[h]=await p.evaluate(()=>location.hash); }
    ok(app.hash==="#schedule"&&app.portal&&/Demo/.test(app.brand)&&app.rows>5&&app.ag==="none"&&routes.notes==="#home"&&routes.nolan==="#home",
      `a guest can use the whole organizer with the demo data, but not Nolan's own pages (${JSON.stringify(app)} ${JSON.stringify(routes)})`);
    await p.reload(); await p.waitForTimeout(600);
    const again=await p.evaluate(()=>({guest:document.documentElement.hasAttribute("data-guest"),locked:document.documentElement.hasAttribute("data-locked")}));
    ok(again.guest&&!again.locked&&!p.requests.some(u=>/jsonbin/.test(u)),`a guest stays a guest on reload, still without the cloud (${JSON.stringify(again)})`);
    await p.goto(PAGE+"#settings"); await p.waitForTimeout(400);
    const label=await p.evaluate(()=>document.getElementById("logout").innerText);
    await Promise.all([p.waitForNavigation({waitUntil:"load"}),p.click("#logout")]); await p.waitForTimeout(400);
    ok(/invitado/i.test(label)&&await p.evaluate(()=>document.documentElement.hasAttribute("data-locked")&&!document.documentElement.hasAttribute("data-guest")&&!sessionStorage.getItem("nolan-guest")&&!document.getElementById("gateStart").hidden),
      "Settings has the way out of guest mode, back to the entry screen");
    await p.context().close();
  }

  section("Settings");
  {
    /* smooth scrolling: a notch of the wheel glides home's window there; turned off, it jumps at once */
    const p=await open(b,{hash:"home",settings:{quality:"low"}});
    const wheel=async()=>{ await p.mouse.move(640,450); const y0=await p.evaluate(()=>document.getElementById("portal").scrollTop);
      await p.mouse.wheel(0,300); await p.waitForTimeout(60); const mid=await p.evaluate(()=>document.getElementById("portal").scrollTop);
      await p.waitForTimeout(1200); const end=await p.evaluate(()=>document.getElementById("portal").scrollTop); return {y0,mid,end}; };
    const nat=await wheel();                           /* off by default */
    await p.evaluate(()=>{ document.getElementById("portal").scrollTop=0; saveSetting("scroll","smooth"); }); await p.waitForTimeout(300);
    const sm=await wheel();
    ok(sm.mid>sm.y0&&sm.mid<sm.y0+280&&Math.abs(sm.end-sm.y0-300)<3&&Math.abs(nat.mid-nat.y0-300)<3&&await p.evaluate(()=>SETTINGS_DEFAULTS.scroll==="native"),
      `smooth scrolling: off by default (a notch jumps at once); turned on, the wheel glides (part of the way at first, all of it after) (${JSON.stringify({sm,nat})})`);
    await p.context().close();
  }
  {
    const p=await open(b,{hash:"settings"});
    ok(await p.evaluate(()=>!document.getElementById("settings").hidden&&document.querySelectorAll("#settingsList .seg").length===3&&!!document.querySelector(".seg[data-key=look]")&&!!document.querySelector(".seg[data-key=scroll]")&&!document.querySelector(".seg[data-key=theme]")),"#settings shows language, Effects (one choice for animations and quality) and smooth scrolling (no light theme any more)");
    const nav=p.waitForEvent("framenavigated");
    await p.click('.seg[data-key=lang] button[data-value=en]'); await p.waitForTimeout(250);
    ok(await p.evaluate(()=>document.getElementById("shift").classList.contains("on")&&!document.querySelector("#shift canvas")),"changing a setting fades softly before reloading (no tunnel of stars)");
    await nav; await p.waitForLoadState("domcontentloaded");
    ok(await p.evaluate(()=>document.documentElement.classList.contains("shifting")||document.getElementById("shift").classList.contains("on")),"after reloading, the passage still covers the page");
    await p.waitForLoadState("load");
    await p.waitForFunction(()=>!document.documentElement.classList.contains("shifting")&&!document.getElementById("shift").classList.contains("on"),null,{timeout:20000}).catch(()=>{});
    const en=await p.evaluate(()=>({lang:document.documentElement.lang,tab:document.querySelector("a[data-tab=schedule] .tab-label").textContent,
      title:document.querySelector("#settings h2").textContent,shift:document.getElementById("shift").classList.contains("on"),
      light:!!document.querySelector('link[href*="light.css"]')}));
    ok(en.lang==="en"&&en.tab==="Schedule"&&en.title==="Settings"&&!en.shift,`English after reloading, and the passage has faded away (${JSON.stringify(en)})`);
    ok(!en.light,"the light theme is gone");
    await p.context().close();
  }
  for(const lang of ["es","en"]){
    const p=await open(b,{settings:{lang}});
    /* every page, and every sight's own words (the Moon's with its phase tonight) */
    for(const h of ["schedule","subjects","exams","tasks","faculty","notes","settings","home","nolan",...await p.evaluate(()=>Home.sights())]){ await p.goto(PAGE+"#"+h); await p.waitForTimeout(250); }
    const r=await p.evaluate(()=>({missing:[...I18N_MISSING],raw:[...document.querySelectorAll("body *")].filter(el=>el.children.length===0&&/^[a-z]+\.[a-zA-Z.]+$/.test(el.textContent.trim())).map(el=>el.textContent)}));
    ok(!r.missing.length&&!r.raw.length&&!p.errors.length,`${lang}: every text has a translation ${r.missing.concat(r.raw).join(", ")}`);
    await p.context().close();
  }
  {
    const p=await open(b,{settings:{lang:"en"},time:"2026-10-27T10:00:00"});
    const r=await p.evaluate(()=>[document.getElementById("dayTitle").textContent,document.getElementById("next7").textContent]);
    ok(r[0]==="Today · Tuesday, 27 October"&&/closes Saturday/.test(r[1]),`English dates: "${r[0]}"`);
    await p.context().close();
  }
  {
    const p=await open(b,{settings:{motion:"none"},hash:"schedule"});
    ok(await p.evaluate(()=>getComputedStyle(document.querySelector(".sky-layer.l-a")).animationName==="none"&&document.documentElement.dataset.motion==="none"),"Animations: None stops everything");
    await p.context().close();
    const q=await open(b,{settings:{motion:"basic"},hash:"schedule"});
    ok(await q.evaluate(()=>getComputedStyle(document.querySelector(".sky-layer.l-a")).animationName==="none"&&getComputedStyle(document.querySelector("#stats b")).animationName!==undefined),"Animations: Basic stops the decorations");
    await q.context().close();
  }

  section("Astral");
  {
    {
      /* before the weather arrives its card already has its full shape: nothing on home moves when it comes */
      const w=await open(b,{time:"2026-09-23T16:05:00",mobile:true,routes:fakeWeather(2500)});
      const box=()=>w.evaluate(()=>({wait:!!document.querySelector("#homeWeather .w-card.w-wait"),h:document.getElementById("homeWeather").offsetHeight,   /* (its layout: the intro animation scales it for a moment) */
        temp:(document.querySelector("#homeWeather .w-temp")||{}).textContent}));
      const before=await box();
      await w.waitForFunction(()=>!document.querySelector("#homeWeather .w-wait"),null,{timeout:10000}).catch(()=>{});
      const after=await box();
      ok(before.wait&&!after.wait&&after.temp==="24°"&&before.h>0&&Math.abs(before.h-after.h)<=1,`the weather card keeps its size when the weather arrives (${JSON.stringify([before,after])})`);
      await w.context().close();
    }
    const p=await open(b,{time:"2026-09-23T16:05:00",routes:fakeWeather()});
    await p.waitForTimeout(1500);
    const r=await p.evaluate(()=>({w:document.getElementById("homeWeather").textContent,
      layers:document.querySelectorAll("#sky .sky-layer").length,shown:getComputedStyle(document.querySelector("#sky .sky-par")).display,
      header:!!document.getElementById("skyInfo")}));
    ok(/24°/.test(r.w)&&/Getafe/.test(r.w)&&/20:13/.test(r.w)&&/Máx\.28°/.test(r.w)&&/Puesta de sol20:13/.test(r.w)&&!r.header,`weather and sunset on home, nothing under the UC3M clock ("${r.w}")`);
    const painted=await p.waitForFunction(()=>Universe.gl()&&Universe.painted()===5,null,{timeout:120000}).then(()=>true,()=>false);
    ok(painted&&await p.evaluate(()=>document.documentElement.classList.contains("gl")&&getComputedStyle(document.getElementById("sky")).display==="none"),"Quality = High: the whole sky and the five galaxies are drawn in 3D by the graphics card (the CSS sky steps aside)");
    const all=await p.waitForFunction(()=>Universe.built().length===8,null,{timeout:60000}).then(()=>true,()=>false);
    ok(all&&await p.evaluate(()=>{ Universe.seek(120); Universe.shoot(.4); return true; })&&!p.errors.length,"the three small companions are built too; time, shooting stars and a comet run without errors");
    ok(await p.evaluate(()=>{ const G=Universe.GALAXIES; return G.uc3m.at.d[0]<0&&G.uc3m.at.d[1]>0&&G.uc3m.bulge.q[1]<.5&&G.nolan.at.d[0]>0&&Object.keys(G).join()==="nolan,uc3m,forge,ringgalaxy,edgeon"; }),
      "UC3M's galaxy is the golden barred spiral low on the left; home's is the blue spiral");
    /* the wonders: each one compiled and drawn, a supernova shown, nothing left out */
    await p.waitForFunction(()=>window.UNIVERSE_EXTRAS.every(x=>x.ready||x.broken),null,{timeout:60000}).catch(()=>{});
    await p.waitForTimeout(300);
    const wn=await p.evaluate(()=>({list:Wonders.list(),broken:window.UNIVERSE_EXTRAS.filter(x=>x.broken).map(x=>x.id),nova:Wonders.nova(-.5,-.5,10),state:Wonders.state()}));
    ok(wn.list.join()==="orion,pleiades,ringneb,binary,antennae,nova,earth"&&!wn.broken.length&&wn.nova&&wn.state&&wn.state.k>0&&wn.state.at&&!p.errors.length,
      `the seven wonders compile and draw, and a supernova can flare (${JSON.stringify(wn)})`);
    /* the band of our galaxy is painted, and its dust is drawn */
    ok(await p.evaluate(()=>Universe.band())&&!p.errors.length,"the band of our galaxy crosses the sky, painted once");
    /* the opening: from the Earth and the Moon, the first time in a session */
    ok(await p.evaluate(()=>{ Universe.go("gate",{animate:false}); return Universe.ready(); })&&!p.errors.length,"the Earth and the Moon are drawn at the opening");
    /* going back to the Earth: the camera flies back behind home, the Earth fills the middle and the
       black hole, a speck that far away, is not traced over it */
    await p.evaluate(()=>{ location.hash="#earth"; });
    await p.waitForFunction(()=>location.hash==="#earth"&&!Universe.busy(),null,{timeout:20000}).catch(()=>{});
    const earth=await p.evaluate(()=>({scene:Universe.scene(),cam:Universe.camera().z,pl:Universe.place("earth"),moon:Universe.place("moon"),hole:Universe.hole()}));
    ok(earth.scene==="earth"&&earth.cam<-400&&earth.pl&&Math.abs(earth.pl.x-640)<90&&earth.pl.r>200&&earth.moon&&!earth.hole&&!p.errors.length,
      `the Earth: a place of its own, far behind home, with the Moon beside it (${JSON.stringify(earth)})`);
    await p.context().close();
    /* the real sky, computed without connection */
    const ast=await (async()=>{ const a=await open(b,{time:"2026-08-12T22:00:00",hash:"schedule"});
      const r=await a.evaluate(()=>({new0:Astro.moon(new Date(2026,7,12,12)).name,full:Astro.moon(new Date(2026,9,26,12)).name,
        per:(Astro.shower(new Date(2026,7,12,22))||{}).id,gem:(Astro.shower(new Date(2026,11,14,22))||{}).id,none:Astro.shower(new Date(2026,2,10))}));
      await a.context().close(); return r; })();
    ok(ast.new0==="new"&&ast.full==="full"&&ast.per==="perseids"&&ast.gem==="geminids"&&ast.none===null,
      `the Moon's phase and the meteor showers come out right (${JSON.stringify(ast)})`);
    const q=await open(b,{settings:{quality:"low"},hash:"tasks"});
    const s=await q.evaluate(()=>({shown:getComputedStyle(document.querySelector("#sky .sky-par")).display,
      blur:getComputedStyle(document.querySelector("nav.bar")).backdropFilter,stars:document.querySelectorAll("#tasksConstellation .c-star").length}));
    ok(s.shown==="none"&&(s.blur==="none"||!s.blur),"Quality = Low: no stars, no glass");
    ok(await q.evaluate(()=>Universe.painted()===0&&!Universe.gl()&&!document.documentElement.classList.contains("gl")),"Quality = Low: no 3D universe at all");
    await q.locator("#generalTasks input").nth(0).check(); await q.waitForTimeout(200);
    ok(s.stars>0&&await q.evaluate(()=>document.querySelectorAll("#tasksConstellation .c-star.on").length===1),`the constellation lights a star per task done (${s.stars} stars)`);
    await q.context().close();
    const md=await open(b,{settings:{quality:"medium"},hash:"schedule"});
    const mr=await md.evaluate(()=>{ const c=document.querySelector("#sky .sky-simple");
      return {gl:Universe.gl(),cls:document.documentElement.classList.contains("gl"),canvas:!!c&&c.classList.contains("ready")&&c.width>0,
        layers:getComputedStyle(document.querySelector("#sky .sky-par")).display,sky:getComputedStyle(document.getElementById("sky")).display,
        uni:getComputedStyle(document.getElementById("universe")).display,glass:getComputedStyle(document.querySelector("nav.bar")).backdropFilter}; });
    ok(!mr.gl&&!mr.cls&&mr.canvas&&mr.layers==="none"&&mr.sky!=="none"&&mr.uni==="none"&&mr.glass&&mr.glass!=="none"&&!md.errors.length,
      `Quality = Medium: no galaxies, a still sky of simple stars, the glass look kept (${JSON.stringify(mr)})`);
    ok(await md.evaluate(()=>document.querySelectorAll('.seg[data-key="look"] button').length===3
      &&document.querySelector('.seg[data-key="look"] button[aria-checked=true]').dataset.value==="medium"
      &&LOOKS.high.motion==="full"&&LOOKS.high.quality==="high"&&LOOKS.medium.quality==="medium"&&LOOKS.low.motion==="none"&&LOOKS.low.quality==="low"),
      "Effects offers three levels (High, Medium, Minimal), each setting animations and quality together");
    /* Medium: each section is a star; opening one flies into it, quicker than the 3D flight */
    await md.goto(PAGE+"#home"); await md.waitForTimeout(3500);
    await md.click("#homeUc3m"); await md.waitForTimeout(300);
    const fly=await md.evaluate(()=>({busy:Universe.busy(),stars:!!window.Stars,scene:Stars.scene()}));
    await md.waitForFunction(()=>location.hash==="#schedule"&&!Universe.busy(),null,{timeout:5000}).catch(()=>{});
    ok(fly.busy&&fly.stars&&fly.scene==="uc3m"&&await md.evaluate(()=>document.getElementById("portal").hidden&&Stars.scene()==="uc3m"),
      `Quality = Medium: opening UC3M flies into its star and lands in its own sky (${JSON.stringify(fly)})`);
    await md.context().close();
  }

  section("Compact header when scrolled");
  {
    const p=await open(b,{hash:"subjects"});
    await p.waitForTimeout(400); await p.evaluate(()=>window.scrollTo(0,700));
    await p.waitForFunction(()=>scrollY>600&&document.body.classList.contains("compact"),null,{timeout:4000}).catch(()=>{}); await p.waitForTimeout(500);
    const d=await p.evaluate(()=>({on:document.body.classList.contains("compact"),time:document.querySelector(".mini-l .mini-time").textContent,
      home:getComputedStyle(document.querySelector(".mini-l")).opacity,inert:document.querySelector(".mini-r").inert,
      links:[...document.querySelectorAll(".mini-r a")].map(a=>a.getAttribute("href")).join(" ")}));
    ok(d.on&&d.time==="13:06"&&+d.home>.9&&!d.inert&&/#notes/.test(d.links)&&/#settings/.test(d.links),`computer: scrolled down, the tab bar keeps home, the time, notes and settings (${JSON.stringify(d)})`);
    await p.click(".mini-l .home-btn"); await p.waitForTimeout(400);
    ok(await p.evaluate(()=>location.hash==="#home"),"the small logo takes you home");
    await p.goto(PAGE+"#subjects"); await p.waitForTimeout(400); await p.evaluate(()=>window.scrollTo(0,0)); await p.waitForTimeout(300);
    ok(await p.evaluate(()=>!document.body.classList.contains("compact")&&document.querySelector(".mini-l").inert),"back at the top, the full header again");
    await p.context().close();
    const m=await open(b,{hash:"subjects",mobile:true});
    await m.evaluate(()=>{ document.querySelector("body > div.wrap").scrollTop=500; }); await m.waitForTimeout(700);
    const r=await m.evaluate(()=>({on:document.body.classList.contains("compact"),h:document.querySelector("header.top").getBoundingClientRect().height,
      t:getComputedStyle(document.querySelector(".hdr-time")).opacity,txt:document.querySelector(".hdr-time").textContent}));
    ok(r.on&&r.h<90&&+r.t>.9&&r.txt==="13:06",`phone: scrolled down, the header shrinks to one row with the time (${Math.round(r.h)} px)`);
    await m.context().close();
  }

  section("Mobile: swiping between tabs");
  {
    const p=await open(b,{hash:"subjects",mobile:true});
    const cdp=await p.context().newCDPSession(p);
    const swipe=async(x1,x2,end="touchEnd")=>{
      await cdp.send("Input.dispatchTouchEvent",{type:"touchStart",touchPoints:[{x:x1,y:450}]});
      for(let k=1;k<=10;k++) await cdp.send("Input.dispatchTouchEvent",{type:"touchMove",touchPoints:[{x:x1+(x2-x1)*k/10,y:450}]});
      await cdp.send("Input.dispatchTouchEvent",{type:end,touchPoints:[]});
      await p.waitForTimeout(700);
      return p.evaluate(()=>document.querySelector("a[data-tab].on").dataset.tab);
    };
    ok(await swipe(320,80)==="exams","to the left: next tab");
    ok(await swipe(80,320)==="subjects","to the right: previous tab");
    await swipe(300,180,"touchCancel");
    ok(await p.evaluate(()=>{ const w=document.querySelector("body > div.wrap"); return !w.style.transform&&!w.style.opacity; }),"a cancelled gesture leaves everything in place");
    await p.context().close();
  }

  section("Idle");
  {
    const p=await open(b,{clock:"live"});
    await p.clock.runFor(60000);
    ok(await p.evaluate(()=>!document.body.classList.contains("idle")),"a minute without touching anything: the sky still lives");
    await p.clock.runFor(61000);
    ok(await p.evaluate(()=>document.body.classList.contains("idle")),"after 2 minutes without touching anything the decorations stop");
    await p.mouse.click(100,400); await p.clock.runFor(100);
    ok(await p.evaluate(()=>!document.body.classList.contains("idle")),"touching brings them back");
    await p.context().close();
  }

  section("Offline");
  {
    /* the offline copy needs the site served over http: a tiny local server */
    const http=require("http"), fs=require("fs");
    const TYPES={".html":"text/html",".js":"text/javascript",".css":"text/css",".png":"image/png",".svg":"image/svg+xml",".ico":"image/x-icon",".webmanifest":"application/manifest+json"};
    const root=path.resolve(__dirname,"..");
    const srv=http.createServer((q,s)=>{
      const f=path.join(root,decodeURIComponent(q.url.split("?")[0]).replace(/\/$/,"/index.html"));
      if(!f.startsWith(root)||!fs.existsSync(f)){ s.writeHead(404); s.end(); return; }
      s.writeHead(200,{"Content-Type":TYPES[path.extname(f)]||"application/octet-stream"}); fs.createReadStream(f).pipe(s);
    });
    await new Promise(r=>srv.listen(0,"127.0.0.1",r));
    const URL0=`http://127.0.0.1:${srv.address().port}/`;
    const ctx=await b.newContext({viewport:{width:1280,height:900}});
    const writes=[];
    await ctx.route(/fonts\.(googleapis|gstatic)\.com|open-meteo|bigdatacloud/,r=>r.abort());
    await ctx.route("https://api.jsonbin.io/**",async r=>{
      if(r.request().method()==="PUT"){ writes.push(JSON.parse(r.request().postData())); return r.fulfill({status:200,body:"{}",contentType:"application/json"}); }
      return r.fulfill({status:200,contentType:"application/json",body:JSON.stringify({record:writes.length?writes[writes.length-1]:{hechas:[]}})});
    });
    await ctx.addInitScript(k=>localStorage.setItem("nolan-device",k),DEVICE);
    await ctx.addInitScript(FAKE_CONFIG);
    const p=await ctx.newPage(); p.errors=[]; p.on("pageerror",e=>p.errors.push(e.message));
    await p.goto(URL0+"#tasks",{waitUntil:"load"});
    await p.evaluate(()=>navigator.serviceWorker.ready.then(()=>true));
    await p.waitForTimeout(2500);                        /* the copy is being kept */
    const kept=await p.evaluate(async()=>{ const c=await caches.open("nolan"); return (await c.keys()).length; });
    await ctx.setOffline(true);
    await p.reload({waitUntil:"load"}); await p.waitForTimeout(800);
    const off=await p.evaluate(()=>({ok:typeof Universe!=="undefined"&&typeof Cloud!=="undefined"&&typeof Router!=="undefined",
      version:document.querySelector("footer .version").textContent,tasks:document.querySelectorAll("#generalTasks input").length}));
    ok(kept>20&&off.ok&&/^v\d/.test(off.version)&&off.tasks>0&&!p.errors.length,`without a connection the site still opens, from the copy on the device (${kept} files kept) ${p.errors.join(" | ")}`);
    /* a task ticked offline survives closing the app, and goes up when the connection is back */
    const id=await p.evaluate(()=>document.querySelector("#generalTasks input").id);
    await p.locator("#generalTasks input").nth(0).check(); await p.waitForTimeout(300);
    await p.reload({waitUntil:"load"}); await p.waitForTimeout(800);
    const still=await p.evaluate(i=>document.getElementById(i).checked,id);
    await ctx.setOffline(false); await p.evaluate(()=>window.dispatchEvent(new Event("online")));
    /* (the page reloads itself when the connection comes back: wait for the save, not on the page) */
    for(let k=0;k<40&&!writes.some(w=>(w.hechas||[]).includes(id));k++) await new Promise(r=>setTimeout(r,200));
    ok(still&&writes.some(w=>(w.hechas||[]).includes(id)),`a task ticked offline is still ticked after reopening, and is saved once online (${still}, ${writes.length} writes)`);
    await ctx.close(); srv.close();
  }

  await b.close();
  const skips=skipped?`, ${skipped} skipped without NOLAN_PIN`:"";
  console.log(failures?`\n${failures} of ${checks} checks failed${skips}.`:`\nAll good (${checks} checks${skips}).`);
  process.exit(failures?1:0);
})();
