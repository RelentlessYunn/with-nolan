/* ==========================================================
   planner.js — monthly calendar for the whole year (from CALENDAR.year),
   with periods, holidays, week numbers, yellow "done" days and the dates
   of EVENTS as chips that open their detail.
   makePlanner(box, {detail, events, personal}) draws one: UC3M's (its own tab,
   every event) and Nolan's (the exams and PERSONAL, from data.js).
   ========================================================== */
function makePlanner(box,{detail="planner-detail",events=EVENTS,personal=[]}={}){
  /* months of the academic year */
  const months=[];
  for(let d=fromISO(CALENDAR.year.from.slice(0,8)+"01"); isoDate(d)<=CALENDAR.year.to; d.setMonth(d.getMonth()+1))
    months.push({y:d.getFullYear(),m:d.getMonth()});
  const indexOf=k=>{ const d=fromISO(k), i=months.findIndex(mo=>mo.y===d.getFullYear()&&mo.m===d.getMonth()); return i<0?0:i; };
  let current=indexOf(todayISO());

  /* teaching week number, only on each row's Monday */
  const weekTag=k=>{
    if(fromISO(k).getDay()!==1) return "";
    const w=weekOf(k);
    return w?`<div class="m-wk">${t("planner.weekTag",{n:w.n})}</div>`:"";
  };
  const chip=(e,closing)=>{
    if(e.personal) return `<button class="m-chip personal" data-pe="${personal.indexOf(e)}" style="--sc:${e.color||"#FFA640"}" `+
      `aria-label="${esc(e.what+(e.time?", "+e.time:""))}"><i></i><span>${esc(e.what)}</span></button>`;
    const S=SUBJECTS[e.subject];
    const label=t("event.title",{type:typeName(e.type),subject:S.name})+(e.noDay?", "+t("event.noDay"):"")+(closing?", "+t("planner.closes"):"");
    const opens=!closing&&!e.noDay&&e.until&&e.until>e.date;   /* a window of several days starts here */
    return `<button class="m-chip ${e.type}${e.noDay?" tbd":""}${closing?" closing":""}${opens?" opens":""}" data-ev="${EVENTS.indexOf(e)}" style="--sc:${S.color}" `+
      `aria-label="${esc(label)}"><i></i><span>${esc(S.short)} · ${esc(closing?t("planner.closes"):typeName(e.type))}</span></button>`;
  };

  /* windows of several days (an online test, a submission…): a line in the
     subject's colour joins the opening chip to the closing one, across the
     days in between. They go first in each day so the lines line up. */
  const all=events.concat(personal.map(e=>({...e,personal:1}))).sort(byDate);
  personal=all.filter(e=>e.personal);
  const spans=events.filter(e=>!e.noDay&&e.until&&e.until>e.date).sort(byDate);
  const link=e=>`<i class="m-link" style="--sc:${SUBJECTS[e.subject].color}" aria-hidden="true"></i>`;
  /* what a day shows for those windows: the chips on the first and last day, a line on the others */
  const spanItems=(k,chips)=>spans.filter(e=>e.date<=k&&e.until>=k)
    .map(e=>!chips?link(e):e.date===k?chip(e):e.until===k?chip(e,true):link(e));

  function render(){
    const mo=months[current], today=todayISO();
    let html=`<div class="month"><div class="m-title">`+
      `<button class="m-nav" data-go="-1"${current===0?" disabled":""} aria-label="${esc(t("planner.prev"))}">‹</button>`+
      `<span class="m-name">${esc(fmtMonthYear(new Date(mo.y,mo.m,1)))}</span>`+
      `<button class="m-nav" data-go="1"${current===months.length-1?" disabled":""} aria-label="${esc(t("planner.next"))}">›</button>`+
      `<button class="m-today" data-go="today">${esc(t("today.button"))}</button></div>`;
    html+='<div class="m-grid head">'+WEEKDAY_LETTER.map(d=>`<div>${d}</div>`).join("")+'</div><div class="m-grid days">';

    const first=new Date(mo.y,mo.m,1).getDay(), lead=first===0?6:first-1;
    const total=new Date(mo.y,mo.m+1,0).getDate();
    /* days of the previous and next month fill the rows */
    const outside=dt=>`<div class="m-day out">${weekTag(isoDate(dt))}<div class="m-date">${dt.getDate()}</div>${spanItems(isoDate(dt),false).join("")}</div>`;
    for(let i=lead;i>0;i--) html+=outside(new Date(mo.y,mo.m,1-i));

    for(let d=1;d<=total;d++){
      const dt=new Date(mo.y,mo.m,d), k=isoDate(dt);
      const weekend=dt.getDay()===0||dt.getDay()===6;
      const h=holidayOn(k), p=periodOn(k), mark=CALENDAR.marks.find(x=>x.date===k);
      const onBreak=p&&p.type==="break";
      let cls="m-day", tag="";
      if(weekend) cls+=" weekend";
      if(onBreak){ cls+=" break"; if(k===p.from||d===1) tag=`<div class="m-tag">${esc(p.label)}</div>`; }
      else if(p&&p.type==="exams"){ cls+=" exams"; if(k===p.from||d===1) tag=`<div class="m-tag">${esc(p.label)}</div>`; }
      if(h&&!weekend&&!onBreak){ cls+=" no-class"; tag=`<div class="m-tag">${esc(t("today.noClass")+(h.campus?" · "+t("today.onlyCampus",{campus:CAMPUS[h.campus.toUpperCase()]}):""))}</div>`; }
      /* yellow progress: any past day without another colour */
      const plain=!weekend&&!(h&&!onBreak)&&!(p&&(p.type==="exams"||onBreak));
      if(plain&&k<today&&k>=CALENDAR.year.from) cls+=" past";
      if(k===today) cls+=" today";
      if(mark) tag=`<div class="m-tag mark">${esc(mark.label)}</div>`+tag;
      /* the chip goes on its date; windows of several days also get one on the closing day */
      const chips=spanItems(k,true)
        .concat(all.filter(e=>e.date===k&&!spans.includes(e)).map(e=>chip(e)));
      html+=`<div class="${cls}"${k===today?' aria-current="date"':""}>${weekTag(k)}<div class="m-date">${d}</div>${tag}${chips.join("")}</div>`;
    }
    const rest=(lead+total)%7;
    if(rest) for(let i=1;i<=7-rest;i++) html+=outside(new Date(mo.y,mo.m+1,i));
    box.innerHTML=html+`</div></div><div id="${detail}" class="ev-detail" hidden></div>`;
  }

  box.addEventListener("click",ev=>{
    const c=ev.target.closest(".m-chip");
    if(c){ if(c.dataset.pe) showPersonal(personal[+c.dataset.pe]); else showDetail(detail,EVENTS[+c.dataset.ev]); return; }
    const b=ev.target.closest("[data-go]"); if(!b) return;
    if(b.dataset.go==="today") current=indexOf(todayISO());
    else { const n=current+(+b.dataset.go); if(n<0||n>=months.length) return; current=n; }
    render();
  });
  closeDetailOn(detail,".m-chip");
  /* a personal plan: what, when, where, a note */
  function showPersonal(e){
    const d=document.getElementById(detail); if(!d) return;
    const rows=[[t("detail.when"),(e.until?fmtRange(fromISO(e.date),fromISO(e.until)):fmtLong(fromISO(e.date)))+(e.time?" · "+e.time:"")]];
    if(e.place) rows.push([t("detail.where"),e.place]);
    d.hidden=false; d.style.borderLeftColor=e.color||"#FFA640";
    d.innerHTML=`<div class="ev-head"><b style="color:${e.color||"#FFA640"}">${esc(e.what)}</b>`+
      `<button class="ev-close" aria-label="${esc(t("close"))}">×</button></div>`+
      `<dl class="ev-dl">`+rows.map(r=>`<dt>${esc(r[0])}</dt><dd>${esc(r[1])}</dd>`).join("")+`</dl>`+
      (e.note?`<p>${esc(e.note)}</p>`:"");
    d.scrollIntoView({block:"nearest",behavior:lowMotion()?"auto":"smooth"});
  }
  /* at midnight the today box and the yellow move on; if you were on today's month, it follows */
  document.addEventListener("newDay",e=>{
    if(current===indexOf(addDays(e.detail,-1))) current=indexOf(e.detail);
    render();
  });
  render();
  return {render};
}
makePlanner($("#planner-grid"));
