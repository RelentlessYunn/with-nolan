/* ==========================================================
   today.js — the day viewer: classes with their room, red "now" line,
   live status ("20 min left"), the day's flags, next 7 days and the
   week's dates and advice. Arrows move between days.
   ========================================================== */
(function(){
  let shown=todayISO();       /* day being shown */
  let followToday=true;       /* if you are on today and midnight passes, it moves on */
  let classes=[];             /* classes of the day being shown */
  const list=$("#dayList");

  /* ---------- full render of the day ---------- */
  function render(){
    const isToday=shown===todayISO(), d=fromISO(shown), week=weekOf(shown);
    followToday=isToday;
    $("#dayTitle").textContent=(isToday?t("today.prefix"):"")+fmtLong(d);
    $("#dayToday").hidden=isToday;
    $("#dayLive").hidden=true;

    /* day flags: holidays, periods and what falls that day */
    const flags=[], h=holidayOn(shown), p=periodOn(shown);
    if(h) flags.push(["off",t("today.noClass")+(h.campus?" · "+t("today.onlyCampus",{campus:CAMPUS[h.campus.toUpperCase()]}):"")]);
    if(p&&p.type!=="classes") flags.push([p.type==="exams"?"exam":"break",p.label]);
    EVENTS.filter(e=>fallsOn(e,shown)).sort(byDate).forEach(e=>flags.push([e.type==="ex"?"exam":e.type==="cf"?"clash":"event",
      SUBJECTS[e.subject].name+" · "+e.what+(e.until&&e.until!==shown?" ("+t("today.until",{day:dayName(fromISO(e.until))})+")":"")]));
    $("#dayFlags").innerHTML=flags.length
      ? '<div class="day-flags">'+flags.map(x=>`<div class="day-flag flag-${x[0]}">${esc(x[1])}</div>`).join("")+'</div>' : "";

    /* classes */
    classes=classesOn(shown);
    list.classList.remove("settled");
    clearTimeout(list.settleTimer);
    /* rows come in once; after that they stay still even if the tab is hidden and shown again */
    list.settleTimer=setTimeout(()=>{ list.classList.add("settled"); delete list.dataset.dir; },900);
    if(!classes.length){
      const reason=noClassReason(shown);
      list.innerHTML=`<div class="empty">${esc(reason?reason.text:t("today.noClassesDay"))}</div>`;
      $("#dayMeta").textContent=week?t("today.weekTerm",{n:week.n,term:t("term.name",{n:termOrdinal(week.term)})}):"";
    }else{
      list.innerHTML=classes.map((c,i)=>{
        const S=SUBJECTS[c.subject];
        return `<button class="trow tap" data-peek="${c.subject}" style="--sc:${S.color};--d:${i*70}ms">`+
          `<span class="sw" style="background:${S.color}"></span>`+
          `<time>${hhmm(c.start)}–${hhmm(c.end)}</time>`+
          `<span class="m"><b>${esc(S.name)}</b><em>${esc(c.kind)} · ${campusOf(c.subject)}</em></span>`+
          `<span class="room">${esc(roomOn(c,shown))}</span></button>`;
      }).join("");
      const campus=[...new Set(classes.map(c=>campusOf(c.subject)))].join(" "+t("and")+" ");
      $("#dayMeta").textContent=tn("today.classes",classes.length)+" · "+campus+(week?" · "+t("today.week",{n:week.n}):"");
    }
    refresh();
    next7();
    weekNotes(week);
  }

  /* ---------- every minute: nothing is rebuilt, only what changes ----------
     Rows are updated in place: focus is kept and no animation replays. */
  function refresh(){
    /* behind home the page is not drawn at all (sky.css): nothing to measure; the "tab" event
       brings it up to date when it shows again */
    if(document.body.classList.contains("portal-open")) return;
    const isToday=shown===todayISO(), m=minutesOf(new Date());
    const rows=$$("#dayList .trow");
    rows.forEach((row,i)=>{
      const c=classes[i]; if(!c) return;
      const st=isToday?classState(c,m):"upcoming";
      row.classList.toggle("now",st==="now");
      row.classList.toggle("done",st==="over");
    });
    nowLine(isToday,m,rows);
  }

  /* ---------- red line: on top before class, at the bottom when done, over the rows in between ---------- */
  const left=min=>min<60?t("dur.min",{m:min}):min%60?t("dur.hmin",{h:Math.floor(min/60),m:min%60}):t("dur.h",{h:min/60});
  function nowLine(isToday,m,rows){
    const live=$("#dayLive");
    let l=list.querySelector(".now-line");
    if(!isToday||!classes.length||rows.length!==classes.length){ if(l) l.remove(); live.hidden=true; return; }
    /* with the section hidden rows measure nothing: it is placed again when shown */
    if(!list.offsetParent) return;
    const last=rows[rows.length-1], end=Math.max(...classes.map(c=>c.end));
    let top=0, mode="", text="";
    if(m<classes[0].start){ mode="pinned-top"; text=t("live.startsIn",{t:left(classes[0].start-m)}); }
    else if(m>=end){ mode="pinned-bottom"; top=last.offsetTop+last.offsetHeight-2; text=t("live.done"); }
    else for(let i=0;i<classes.length;i++){
      const c=classes[i], y=rows[i].offsetTop, h=rows[i].offsetHeight;
      if(m<c.start){ top=y-1; text=t("live.nextIn",{t:left(c.start-m)}); break; }
      if(m<c.end){ top=y+h*((m-c.start)/(c.end-c.start)); text=t("live.left",{t:left(c.end-m)}); break; }
    }
    /* moved and rewritten in place, and only where something changed: a new minute (or the
       compact header, or coming back to the tab) never makes the line or its words fade in again */
    if(!l){ l=document.createElement("div"); l.innerHTML='<span class="pt"></span>'; list.appendChild(l); }
    const cls="now-line"+(mode?" "+mode:""), px=top+"px";
    if(l.className!==cls) l.className=cls;
    if(l.style.top!==px) l.style.top=px;
    /* the text goes in the day header: on the line it covered the time or the room */
    const lc="live"+(mode?" "+mode:"");
    if(live.textContent!==text) live.textContent=text;
    if(live.className!==lc) live.className=lc;
    if(live.hidden) live.hidden=false;
  }

  /* ---------- what falls in the seven days after the one shown ---------- */
  function next7(){
    const until=addDays(shown,7);
    const evs=EVENTS.filter(e=>lastDay(e)>=shown&&e.date<=until
      /* dates without a day show during their whole week */
      || e.noDay&&(()=>{ const w=weekOf(e.date); return w&&w.to>=shown&&w.from<=until; })()).sort(byDate);
    const box=$("#next7");
    if(!evs.length){ box.innerHTML=`<div class="n7-empty">${esc(t("next7.empty"))}</div>`; return; }
    box.innerHTML=`<div class="n7-head">${esc(t("next7.title"))}</div>`+evs.map(e=>{
      const S=SUBJECTS[e.subject];
      const urgent=!e.noDay&&isAssessment(e)&&daysBetween(shown,e.date)<=1;
      return `<button class="n7-card ${e.type}${urgent?" urgent":""}" data-ev="${EVENTS.indexOf(e)}" style="--sc:${S.color}">`+
        `<span class="n7-txt"><b>${esc(t("event.title",{type:typeName(e.type),subject:S.name}))}</b>`+
        `<em>${esc(e.noDay?eventLabel(e):e.time||eventLabel(e))}</em></span>`+
        `<span class="n7-when">${esc(whenLabel(e,shown))}</span></button>`;
    }).join("");
  }

  /* ---------- the week: first what falls (straight from EVENTS), then the ADVICE ---------- */
  function weekNotes(week){
    const box=$("#weekNotes");
    if(!week){ box.innerHTML=""; return; }
    const evs=EVENTS.filter(e=>{ const w=weekOf(e.date); return w&&w.term===week.term&&w.n===week.n; }).sort(byDate);
    const advice=(ADVICE[week.term]&&ADVICE[week.term][week.n])||[];
    if(!evs.length&&!advice.length){ box.innerHTML=""; return; }
    const open=box.querySelector("details[open]")&&box.dataset.week===week.term+"-"+week.n;
    box.dataset.week=week.term+"-"+week.n;
    const count=[evs.length?tn("week.dates",evs.length):"",advice.length?tn("week.advice",advice.length):""].filter(Boolean).join(" · ");
    const current=weekOf(todayISO());
    box.innerHTML=`<details class="week-notes"${open?" open":""}><summary>${esc(current&&current.term===week.term&&current.n===week.n?t("week.this"):t("week.n",{n:week.n}))}`+
      `<span>${esc(count)}</span></summary>`+
      (evs.length?`<ul class="week-events">`+evs.map(e=>`<li style="--sc:${SUBJECTS[e.subject].color}"><b>${esc(e.noDay?t("week.noDay"):e.until?eventLabel(e):fmtDayShort(fromISO(e.date)))}</b>`+
        `<span>${esc(typeName(e.type))} · ${esc(SUBJECTS[e.subject].short)} · ${esc(e.what)}</span></li>`).join("")+`</ul>`:"")+
      (advice.length?`<ul class="tight">`+advice.map(x=>`<li>${esc(x)}</li>`).join("")+`</ul>`:"")+
      `</details>`;
  }

  /* ---------- subject card under the list (the same as in Subjects) ---------- */
  function peek(k){
    const box=$("#subjectPeek");
    if(box.dataset.k===k && !box.hidden){ box.hidden=true; box.dataset.k=""; return; }
    box.dataset.k=k;
    box.innerHTML=`<button class="ev-close peek-x" aria-label="${esc(t("today.closeCard"))}">×</button>`+
      subjectCard(k,{accordion:false, scope:"peek", editable:false});
    /* grades are copied from the main card, which is where they are edited */
    box.querySelectorAll('.g-input[data-scope="peek"]').forEach(inp=>{
      const source=document.getElementById(inp.id.replace("g_peek_","g_main_"));
      if(source) inp.value=source.value;
    });
    recalc(k,"peek");
    const calc=box.querySelector(".calc");
    if(calc) calc.insertAdjacentHTML("beforeend",`<div class="calc-ro">${t("today.gradesEditedIn")}</div>`);
    box.hidden=false;
    box.scrollIntoView({block:"nearest",behavior:lowMotion()?"auto":"smooth"});
  }
  document.addEventListener("click",ev=>{
    const tgt=ev.target.closest("[data-peek]");
    if(tgt){ peek(tgt.dataset.peek); return; }
    if(ev.target.closest(".peek-x")){ const box=$("#subjectPeek"); box.hidden=true; box.dataset.k=""; }
    const card=ev.target.closest(".n7-card");
    if(card) showDetail("today-detail", EVENTS[+card.dataset.ev]);
  });
  closeDetailOn("today-detail",".n7-card");

  /* ---------- time ---------- */
  document.addEventListener("minute",()=>{
    if($("#today").hidden) return;                  /* hidden: measured when shown again */
    if(shown===todayISO()) refresh();
  });
  document.addEventListener("newDay",e=>{
    if(followToday){ shown=e.detail; render(); } else next7();
  });
  document.addEventListener("tab",e=>{ if(e.detail==="schedule") refresh(); });
  let rz=0;
  window.addEventListener("resize",()=>{ cancelAnimationFrame(rz); rz=requestAnimationFrame(refresh); });
  if(document.fonts&&document.fonts.ready) document.fonts.ready.then(refresh);

  /* ---------- arrows: the new day comes in from the side you move towards ---------- */
  const go=(dir,day)=>{ shown=day; list.dataset.dir=dir; render(); };
  $("#dayPrev").addEventListener("click",()=>go("prev",addDays(shown,-1)));
  $("#dayNext").addEventListener("click",()=>go("next",addDays(shown,1)));
  $("#dayToday").addEventListener("click",()=>go(shown>todayISO()?"prev":"next",todayISO()));

  render();
})();
