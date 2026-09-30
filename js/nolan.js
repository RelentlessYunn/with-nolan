/* ==========================================================
   nolan.js — the Nolan section: built like the UC3M app (its header with
   the logo, the clock, the date and the week) with three windows of his
   own, one at a time, chosen in the row under the header:
     · Día (#nolan, #nolan/dia): one day, hour by hour.
     · Semana (#nolan/semana): the seven days of a week side by side.
     · Mes (#nolan/mes): the month planner (planner.js).
   The day and the week show the UC3M classes and events, his weekly routine
   (ROUTINE in data.js), his plans (PERSONAL in data.js) and every event added
   with "+" (MyEvents, planner.js); the month, the events and plans. Adding is always the same
   form (the month's): the "+" of the day and the week opens it on that day.
   Its design is in css/nolan.css.
   ========================================================== */
const Nolan=(function(){
  const icon=`<svg class="i-crane" viewBox="0 0 48 48" aria-hidden="true">
    <path d="M12 44V10M16 44V12M12 40l4-4-4-4 4-4-4-4 4-4-4-4 4-4-4-4"/>
    <path d="M4 12h40M12 10 16 5l2 7M16 5 40 12"/>
    <rect class="f2" x="4.5" y="12.5" width="5" height="4.5" rx="1"/>
    <path d="M7 44h14"/>
    <g class="hook"><path d="M34 12v13"/><rect class="f" x="30" y="25" width="8" height="6.5" rx="1"/></g></svg>`;
  const WINDOWS=[["dia","nolan.day"],["semana","nolan.week"],["mes","nolan.month"]];
  const ALIAS={day:"dia",today:"dia",hoy:"dia",week:"semana",month:"mes"};
  let box=null, cal=null, shown="dia", day=todayISO(), weekStart=null;
  const routine=()=>typeof ROUTINE!=="undefined"?ROUTINE:[];
  const personal=()=>typeof PERSONAL!=="undefined"?PERSONAL:[];
  const mondayOf=k=>addDays(k,-((fromISO(k).getDay()+6)%7));
  const okColor=c=>/^#[0-9a-f]{3,8}$/i.test(c||"")?c:"#FFA640";
  /* the first time of a text ("18:00", "12:30–14:00"), in minutes; none: -1 (it goes first, all day) */
  const minutesIn=s=>{ const m=/(\d{1,2})[:.](\d{2})/.exec(s||""); return m?+m[1]*60+ +m[2]:-1; };

  /* everything of one day, in order: {at, time, what, sub, color, kind} */
  function itemsOn(k){
    const out=[], dow=(fromISO(k).getDay()+6)%7;           /* 0 Monday … 6 Sunday */
    classesOn(k).forEach(c=>{ const S=SUBJECTS[c.subject];
      out.push({at:c.start,time:hhmm(c.start)+"–"+hhmm(c.end),what:S.name,sub:c.kind+" · "+roomOn(c,k),color:S.color,kind:"class"}); });
    routine().filter(r=>r.day===dow&&(!r.from||k>=r.from)&&(!r.to||k<=r.to)).forEach(r=>
      out.push({at:minutesIn(r.start),time:r.start+(r.end?"–"+r.end:""),what:r.what,sub:r.place||"",color:okColor(r.color),kind:"routine"}));
    EVENTS.filter(e=>!e.noDay&&e.date<=k&&(e.until||e.date)>=k).forEach(e=>{ const S=SUBJECTS[e.subject];
      if((e.type==="cl"||e.type==="cf")&&classesOn(k).some(c=>c.subject===e.subject)) return;          /* (already there as its class) */
      out.push({at:minutesIn(e.time),time:e.time||"",what:S.short+" · "+e.what,sub:e.room||"",color:S.color,kind:e.type==="ex"?"exam":"event"}); });
    personal().concat(MyEvents.list()).filter(e=>e.date<=k&&(e.until||e.date)>=k).forEach(e=>
      out.push({at:minutesIn(e.time),time:e.time||"",what:e.what,sub:[e.place,e.note].filter(Boolean).join(" · "),color:okColor(e.color),kind:"plan"}));
    return out.sort((a,b)=>a.at-b.at);
  }
  const item=x=>`<li class="n-item ${x.kind}" style="--sc:${x.color}"><time>${esc(x.time||t("nolan.allDay"))}</time>`+
    `<span><b>${esc(x.what)}</b>${x.sub?`<em>${esc(x.sub)}</em>`:""}</span></li>`;
  const bar=(label,sub,attr)=>`<div class="m-title n-bar"><button class="m-nav" data-step="-1" aria-label="${esc(t("nolan.prev"))}">‹</button>`+
    `<span class="m-name">${esc(label)}${sub?`<small>${esc(sub)}</small>`:""}</span>`+
    `<button class="m-nav" data-step="1" aria-label="${esc(t("nolan.next"))}">›</button>`+
    `<button class="m-today" data-step="0">${esc(t("today.button"))}</button>`+
    `<button class="m-add" data-add="${attr}" aria-label="${esc(t("planner.addAria"))}"><b aria-hidden="true">+</b><span>${esc(t("planner.add"))}</span></button></div>`;

  function drawDay(){
    const list=itemsOn(day), d=fromISO(day), w=weekOf(day);
    $("#n-day").innerHTML=`<div class="month">`+bar(cap(fmtLong(d)),w?t("header.week",{n:w.n}):"",day)+
      (list.length?`<ul class="n-list">${list.map(item).join("")}</ul>`:`<p class="n-empty">${esc(t("nolan.nothing"))}</p>`)+`</div>`;
  }
  function drawWeek(){
    const days=[...Array(7)].map((_,i)=>addDays(weekStart,i)), today=todayISO();
    const w=weekOf(addDays(weekStart,2));
    $("#n-week").innerHTML=`<div class="month">`+bar(fmtRange(fromISO(days[0]),fromISO(days[6])),w?t("header.week",{n:w.n}):"",days.includes(today)?today:days[0])+
      `<div class="n-days">`+days.map(k=>{ const d=fromISO(k), list=itemsOn(k);
        return `<div class="n-col${k===today?" today":""}${d.getDay()%6===0?" weekend":""}" data-day="${k}">`+
          `<h4>${esc(WEEKDAY_SHORT[d.getDay()])} <b>${d.getDate()}</b></h4>`+
          (list.length?`<ul class="n-list small">${list.map(item).join("")}</ul>`:"")+`</div>`; }).join("")+`</div></div>`;
  }
  function draw(){
    WINDOWS.forEach(([id])=>{ const el=$("#n-"+({dia:"day",semana:"week",mes:"month"})[id]); if(el) el.hidden=id!==shown; });
    box.querySelectorAll(".n-tabs a").forEach(a=>a.setAttribute("aria-current",a.dataset.w===shown?"page":"false"));
    if(shown==="dia") drawDay(); else if(shown==="semana") drawWeek(); else cal.render();
  }

  function build(){
    box.innerHTML=
      `<div class="n-head">`+
        `<div class="hdr-top"><div class="hdr-left">`+
          `<a class="icon home-btn" href="#home" aria-label="${esc(t("nolan.backAria"))}" title="${esc(t("nolan.backAria"))}">${LOGO_SVG}</a>`+
          `<span class="brand">${esc(t("nolan.brand"))}</span></div></div>`+
        `<div class="hdr-main"><div class="clock"><div class="clock-time n-time"></div><div class="clock-date n-date"></div></div>`+
          `<div class="hdr-meta"><div class="week-badge n-week"></div></div></div>`+
      `</div>`+
      `<nav class="n-tabs" aria-label="${esc(t("nolan.windows"))}">`+WINDOWS.map(([id,k])=>`<a href="#nolan/${id}" data-w="${id}">${esc(t(k))}</a>`).join("")+`</nav>`+
      `<section class="n-win" id="n-day"></section>`+
      `<section class="n-win" id="n-week" hidden></section>`+
      `<section class="n-win" id="n-month" hidden><div id="nolan-grid"></div></section>`;
    cal=makePlanner($("#nolan-grid"),{detail:"nolan-detail",events:EVENTS,personal:personal(),mine:()=>MyEvents.list(),where:"nolan"});
    /* the arrows, "today" and "+" of the day and the week */
    box.addEventListener("click",ev=>{
      const a=ev.target.closest("[data-add]");
      if(a){ pendingAdd=a.dataset.add; location.hash="#nolan/mes"; return; }       /* (the form opens once the month shows) */
      const col=ev.target.closest(".n-col[data-day]");
      if(col&&!ev.target.closest(".n-item")){ day=col.dataset.day; location.hash="#nolan/dia"; return; }
      const s=ev.target.closest("[data-step]"); if(!s||shown==="mes") return;
      const n=+s.dataset.step;
      if(shown==="dia") day=n?addDays(day,n):todayISO();
      else weekStart=n?addDays(weekStart,7*n):mondayOf(todayISO());
      draw();
    });
    /* the clock, the date and the week are the app header's own (header.js keeps them right) */
    const tick=()=>{
      const n=new Date(), hm=String(n.getHours()).padStart(2,"0")+":"+String(n.getMinutes()).padStart(2,"0");
      const put=(sel,v,html)=>{ const el=box.querySelector(sel); if(el&&(html?el.innerHTML:el.textContent)!==v) html?el.innerHTML=v:el.textContent=v; };
      put(".n-time",hm); put(".n-date",($("#clockDate")||{}).textContent||""); put(".n-week",($("#weekBadge")||{}).innerHTML||"",true);
    };
    tick(); document.addEventListener("minute",tick);
    document.addEventListener("newDay",e=>{ tick(); if(day===addDays(e.detail,-1)) day=e.detail; if(box&&!box.hidden) draw(); });
    MyEvents.onChange(()=>{ if(shown!=="mes") draw(); });
    return tick;
  }
  let tick=null, pendingAdd=null;
  return {
    title:"Nolan", icon,
    /* Home calls it when #nolan (or #nolan/dia, /semana, /mes) opens */
    render(el,subroute){
      if(!box){ box=el; tick=build(); weekStart=mondayOf(todayISO()); }
      const w=ALIAS[subroute]||subroute;
      shown=WINDOWS.some(([id])=>id===w)?w:"dia";
      tick(); draw();
      if(shown==="mes"&&pendingAdd){ const k=pendingAdd; pendingAdd=null; cal.add(k); }
    }
  };
})();
