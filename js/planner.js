/* ==========================================================
   planner.js — monthly calendar for the whole year (from CALENDAR.year),
   with periods, holidays, week numbers, yellow "done" days and the dates
   of EVENTS as chips that open their detail.
   makePlanner(box, {detail, events, personal, mine, where}) draws one:
   UC3M's (its own tab) and Nolan's (#nolan: every UC3M event, PERSONAL from
   data.js, and all of your own).
   Your own events: each calendar has a "+" button (and a tap on a day) that
   adds one; tap it to see it, change it or delete it. They live in MyEvents.
   ========================================================== */

/* ---------- your own events, added with the "+" of a calendar ----------
   Nolan: kept in the cloud (JSONBin, key "eventos", like ticks and notes), so every device sees
   them; without the cloud, on this device. A guest's: for this visit only (sessionStorage), like
   everything else of a guest.
   Each: {id, date, until?, time?, what, place?, note?, color, where:"uc3m"|"nolan"}.
   UC3M's calendar shows the "uc3m" ones; Nolan's shows them all. */
const MyEvents=(function(){
  const guest=document.documentElement.hasAttribute("data-guest");
  const LOCAL=guest?"nolan-guest-events":"nolan-my-events";
  const box=()=>guest?sessionStorage:localStorage;
  const cloud=()=>typeof Cloud!=="undefined"&&Cloud.enabled&&!guest;
  const listeners=[];
  let all={};
  const tell=()=>listeners.forEach(fn=>{ try{ fn(); }catch(e){ console.error(e); } });
  const keep=()=>{ try{ box().setItem(LOCAL,JSON.stringify(all)); }catch(e){} };
  if(cloud()) Cloud.onLoad(rec=>{ all=copyOf(rec.eventos); tell(); });
  else try{ all=JSON.parse(box().getItem(LOCAL)||"{}")||{}; }catch(e){ all={}; }
  function copyOf(o){ return JSON.parse(JSON.stringify(o||{})); }
  function put(id,ev){
    if(ev) all[id]=ev; else delete all[id];
    if(cloud()) Cloud.change("event:"+id,{op:"event",args:{id,ev:ev||null}}); else keep();
    tell();
  }
  return {
    list:where=>Object.values(all).filter(e=>e&&e.date&&e.what&&(!where||e.where===where)),
    get:id=>all[id],
    save(ev){ const id=ev.id||Date.now().toString(36)+Math.random().toString(36).slice(2,6); put(id,{...ev,id}); return id; },
    remove:id=>put(id,null),
    onChange:fn=>listeners.push(fn)
  };
})();

/* the colours a new event can take */
const MY_COLORS=["#FFA640","#5AA9FF","#3FD9A4","#FF6B5E","#A987FF","#F06BD4","#3FCCE8","#E8E8F0"];

function makePlanner(box,{detail="planner-detail",events=EVENTS,personal=[],mine=()=>MyEvents.list("uc3m"),where="uc3m"}={}){
  /* months of the academic year */
  const months=[];
  for(let d=fromISO(CALENDAR.year.from.slice(0,8)+"01"); isoDate(d)<=CALENDAR.year.to; d.setMonth(d.getMonth()+1))
    months.push({y:d.getFullYear(),m:d.getMonth()});
  const indexOf=k=>{ const d=fromISO(k), i=months.findIndex(mo=>mo.y===d.getFullYear()&&mo.m===d.getMonth()); return i<0?0:i; };
  let current=indexOf(todayISO());
  let extra=[];                     /* PERSONAL and your own events, as drawn now (chips point into it) */

  /* teaching week number, only on each row's Monday */
  const weekTag=k=>{
    if(fromISO(k).getDay()!==1) return "";
    const w=weekOf(k);
    return w?`<div class="m-wk">${t("planner.weekTag",{n:w.n})}</div>`:"";
  };
  const colorOf=e=>e.subject?SUBJECTS[e.subject].color:/^#[0-9a-f]{3,8}$/i.test(e.color||"")?e.color:"#FFA640";
  const chip=(e,closing)=>{
    const opens=!closing&&!e.noDay&&e.until&&e.until>e.date;   /* a window of several days starts here */
    const ends=`${closing?" closing":""}${opens?" opens":""}`;
    if(!e.subject) return `<button class="m-chip personal${e.own?" own":""}${ends}" data-pe="${extra.indexOf(e)}" style="--sc:${colorOf(e)}" `+
      `aria-label="${esc(e.what+(e.time?", "+e.time:"")+(closing?", "+t("planner.closes"):""))}"><i></i><span>${esc(closing?t("planner.closes"):e.what)}</span></button>`;
    const S=SUBJECTS[e.subject];
    const label=t("event.title",{type:typeName(e.type),subject:S.name})+(e.noDay?", "+t("event.noDay"):"")+(closing?", "+t("planner.closes"):"");
    return `<button class="m-chip ${e.type}${e.noDay?" tbd":""}${ends}" data-ev="${EVENTS.indexOf(e)}" style="--sc:${S.color}" `+
      `aria-label="${esc(label)}"><i></i><span>${esc(S.short)} · ${esc(closing?t("planner.closes"):typeName(e.type))}</span></button>`;
  };
  /* windows of several days (an online test, a trip…): a line in its colour joins the opening chip
     to the closing one, across the days in between. They go first in each day so the lines line up. */
  const link=e=>`<i class="m-link" style="--sc:${colorOf(e)}" aria-hidden="true"></i>`;

  function render(){
    extra=personal.map(e=>({...e})).concat(mine().map(e=>({...e,own:1})));
    const all=events.concat(extra).sort(byDate);
    const spans=all.filter(e=>!e.noDay&&e.until&&e.until>e.date);
    /* what a day shows for those windows: the chips on the first and last day, a line on the others */
    const spanItems=(k,chips)=>spans.filter(e=>e.date<=k&&e.until>=k)
      .map(e=>!chips?link(e):e.date===k?chip(e):e.until===k?chip(e,true):link(e));
    const mo=months[current], today=todayISO();
    let html=`<div class="month"><div class="m-title">`+
      `<button class="m-nav" data-go="-1"${current===0?" disabled":""} aria-label="${esc(t("planner.prev"))}">‹</button>`+
      `<span class="m-name">${esc(fmtMonthYear(new Date(mo.y,mo.m,1)))}</span>`+
      `<button class="m-nav" data-go="1"${current===months.length-1?" disabled":""} aria-label="${esc(t("planner.next"))}">›</button>`+
      `<button class="m-today" data-go="today">${esc(t("today.button"))}</button>`+
      `<button class="m-add" data-add aria-label="${esc(t("planner.addAria"))}"><b aria-hidden="true">+</b><span>${esc(t("planner.add"))}</span></button></div>`;
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
      html+=`<div class="${cls}" data-day="${k}"${k===today?' aria-current="date"':""}>${weekTag(k)}<div class="m-date">${d}</div>${tag}${chips.join("")}</div>`;
    }
    const rest=(lead+total)%7;
    if(rest) for(let i=1;i<=7-rest;i++) html+=outside(new Date(mo.y,mo.m+1,i));
    box.innerHTML=html+`</div></div><div id="${detail}" class="ev-detail" hidden></div>`;
  }

  const panel=()=>document.getElementById(detail);
  function show(d,color,html){
    d.hidden=false; d.style.borderLeftColor=color; d.innerHTML=html;
    d.scrollIntoView({block:"nearest",behavior:lowMotion()?"auto":"smooth"});
  }
  const head=(title,color)=>`<div class="ev-head"><b style="color:${color}">${esc(title)}</b>`+
    `<button type="button" class="ev-close" aria-label="${esc(t("close"))}">×</button></div>`;
  /* a plan of PERSONAL or one of your own: what, when, where, a note (yours can be changed or deleted) */
  function showPlan(e){
    const d=panel(); if(!d) return;
    const rows=[[t("detail.when"),(e.until?fmtRange(fromISO(e.date),fromISO(e.until)):fmtLong(fromISO(e.date)))+(e.time?" · "+e.time:"")]];
    if(e.place) rows.push([t("detail.where"),e.place]);
    show(d,colorOf(e),head(e.what,colorOf(e))+
      `<dl class="ev-dl">`+rows.map(r=>`<dt>${esc(r[0])}</dt><dd>${esc(r[1])}</dd>`).join("")+`</dl>`+
      (e.note?`<p class="ev-note">${esc(e.note)}</p>`:"")+
      (e.own?`<div class="ev-actions"><button type="button" class="ev-btn" data-edit="${esc(e.id)}">${esc(t("planner.edit"))}</button>`+
        `<button type="button" class="ev-btn danger" data-del="${esc(e.id)}">${esc(t("planner.delete"))}</button></div>`:""));
  }
  /* the form: a new event (on a day, or today) or one of yours to change */
  function showForm(ev){
    const d=panel(); if(!d) return;
    const e=ev||{}, color=e.color||MY_COLORS[0];
    const field=(name,label,attrs)=>`<label class="f-field"><span>${esc(label)}</span><input name="${name}" ${attrs} value="${esc(e[name]||"")}"></label>`;
    show(d,color,`<form class="ev-form" novalidate>`+head(t(e.id?"planner.editTitle":"planner.addTitle"),"var(--ink)")+
      field("what",t("planner.f.what"),`maxlength="80" required autocomplete="off" placeholder="${esc(t("planner.f.whatHint"))}"`)+
      `<div class="f-row">`+field("date",t("planner.f.date"),`type="date" required min="${CALENDAR.year.from}" max="${CALENDAR.year.to}"`)+
        field("until",t("planner.f.until"),`type="date" min="${CALENDAR.year.from}" max="${CALENDAR.year.to}"`)+`</div>`+
      `<div class="f-row">`+field("time",t("planner.f.time"),`maxlength="30" autocomplete="off" placeholder="18:00"`)+
        field("place",t("planner.f.place"),`maxlength="60" autocomplete="off"`)+`</div>`+
      field("note",t("planner.f.note"),`maxlength="200" autocomplete="off"`)+
      `<div class="f-colors" role="radiogroup" aria-label="${esc(t("planner.f.color"))}">`+MY_COLORS.map(c=>
        `<label class="f-color" style="--c:${c}"><input type="radio" name="color" value="${c}"${c===color?" checked":""}><i></i></label>`).join("")+`</div>`+
      `<p class="f-error" hidden></p>`+
      `<div class="ev-actions"><button type="submit" class="ev-btn main">${esc(t("planner.save"))}</button>`+
        `<button type="button" class="ev-btn" data-cancel>${esc(t("planner.cancel"))}</button></div>`+
      (e.id?`<input type="hidden" name="id" value="${esc(e.id)}"><input type="hidden" name="where" value="${esc(e.where||where)}">`:"")+
      `</form>`);
    const f=d.querySelector("form");
    f.addEventListener("submit",sub=>{
      sub.preventDefault();
      const v=Object.fromEntries(new FormData(f)), err=f.querySelector(".f-error");
      const bad=!v.what.trim()?"planner.err.what":!/^\d{4}-\d{2}-\d{2}$/.test(v.date)?"planner.err.date":v.until&&v.until<v.date?"planner.err.until":"";
      if(bad){ err.textContent=t(bad); err.hidden=false; return; }
      const out={date:v.date,what:v.what.trim(),color:v.color||MY_COLORS[0],where:v.where||where};
      if(v.until&&v.until>v.date) out.until=v.until;
      ["time","place","note"].forEach(k=>{ if(v[k]&&v[k].trim()) out[k]=v[k].trim(); });
      if(v.id) out.id=v.id;
      current=indexOf(out.date);
      MyEvents.save(out);                           /* every calendar redraws (MyEvents.onChange) */
    });
    if(!ev||!ev.id) setTimeout(()=>{ const w=f.querySelector("[name=what]"); if(w) w.focus({preventScroll:true}); },60);
  }

  box.addEventListener("click",ev=>{
    const c=ev.target.closest(".m-chip");
    if(c){ if(c.dataset.pe) showPlan(extra[+c.dataset.pe]); else showDetail(detail,EVENTS[+c.dataset.ev]); return; }
    const edit=ev.target.closest("[data-edit]"); if(edit){ showForm(MyEvents.get(edit.dataset.edit)); return; }
    const del=ev.target.closest("[data-del]");
    if(del){
      /* deleting asks once more, on the same button */
      if(del.dataset.sure){ MyEvents.remove(del.dataset.del); return; }
      del.dataset.sure="1"; del.textContent=t("planner.sure"); return;
    }
    if(ev.target.closest("[data-cancel]")){ const d=panel(); if(d) d.hidden=true; return; }
    if(ev.target.closest("[data-add]")){
      const today=todayISO(), mo=months[current];
      const inMonth=indexOf(today)===current;
      showForm({date:inMonth?today:isoDate(new Date(mo.y,mo.m,1))}); return;
    }
    /* a tap on an empty spot of a day of this month: a new event on that day */
    const day=ev.target.closest(".m-day[data-day]");
    if(day&&!ev.target.closest(".m-link")){ showForm({date:day.dataset.day}); return; }
    const b=ev.target.closest("[data-go]"); if(!b) return;
    if(b.dataset.go==="today") current=indexOf(todayISO());
    else { const n=current+(+b.dataset.go); if(n<0||n>=months.length) return; current=n; }
    render();
  });
  closeDetailOn(detail,".m-chip,.m-add,.m-day[data-day]");
  MyEvents.onChange(render);
  /* at midnight the today box and the yellow move on; if you were on today's month, it follows */
  document.addEventListener("newDay",e=>{
    if(current===indexOf(addDays(e.detail,-1))) current=indexOf(e.detail);
    render();
  });
  render();
  return {render};
}
makePlanner($("#planner-grid"));
