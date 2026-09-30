/* ==========================================================
   core.js — shared helpers. Anything declared at the top level here
   (const / function) is visible to the files loaded after it (see the
   script order in index.html). Nothing is rendered here.
   ========================================================== */

/* ---------- shortcuts ---------- */
const $=s=>document.querySelector(s);
const $$=s=>[...document.querySelectorAll(s)];
const esc=s=>String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
/* Nolan's logo (the N between four stars), for the buttons that take you home */
const LOGO_SVG=`<svg class="logo-mark" viewBox="0 0 64 64" aria-hidden="true"><path class="lm-line" d="M17 47V17L47 47V17"/><circle cx="17" cy="47" r="3.2"/><circle cx="17" cy="17" r="3.2"/><circle cx="47" cy="47" r="3.2"/><circle cx="47" cy="17" r="3.2"/></svg>`;
/* stable id from a title: "Instalar WepSIM y CREATOR" → "instalar-wepsim-y-creator" */
const slug=s=>String(s).normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase()
  .replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,48);
/* app-wide events: document.addEventListener(name, …) */
const emit=(name,detail)=>document.dispatchEvent(new CustomEvent(name,{detail}));

/* ---------- dates and times ----------
   Dates travel as "YYYY-MM-DD" strings (keys). They are turned into Date
   objects at noon, so daylight-saving changes never shift a day. */
const hhmm=m=>String(Math.floor(m/60)).padStart(2,"0")+":"+String(m%60).padStart(2,"0");
const isoDate=d=>d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
const fromISO=k=>new Date(k+"T12:00:00");
const todayISO=()=>isoDate(new Date());
const minutesOf=d=>d.getHours()*60+d.getMinutes();
const daysBetween=(a,b)=>Math.round((fromISO(b)-fromISO(a))/864e5);
const addDays=(k,n)=>{ const d=fromISO(k); d.setDate(d.getDate()+n); return isoDate(d); };

/* ---------- terms and weeks (computed from TERMS) ---------- */
function weeksOf(term){
  const out=[], end=fromISO(term.end);
  /* a term may start on a Tuesday: weeks are anchored to Monday */
  const d=fromISO(term.start); d.setDate(d.getDate()-((d.getDay()+6)%7));
  for(let n=1; d<=end; n++){
    const a=isoDate(d); d.setDate(d.getDate()+6);
    out.push({term:term.n, n, from:a, to:isoDate(d)});
    d.setDate(d.getDate()+1);
  }
  return out;
}
const WEEKS=TERMS.flatMap(weeksOf);
const weekOf=k=>WEEKS.find(w=>k>=w.from&&k<=w.to)||null;
const weeksInTerm=n=>WEEKS.filter(w=>w.term===n).length;

/* Term in force on a date: the last one that has started
   (during the January exams it is still term 1). */
function termOn(k){
  let n=TERMS[0].n;
  TERMS.forEach(t=>{ if(k>=t.start) n=t.n; });
  return n;
}
/* Subjects of the term in force. If the next term's subjects are not in
   data.js yet, the previous ones keep showing instead of an empty page. */
function subjectsOn(k){
  for(let n=termOn(k); n>=1; n--){
    const ids=Object.keys(SUBJECTS).filter(id=>(SUBJECTS[id].term||1)===n);
    if(ids.length) return ids;
  }
  return Object.keys(SUBJECTS);
}
/* Week of a subject's own term, for syllabus progress: 0 before it starts, 99 after it ends. */
function progressWeek(id,k){
  const t=TERMS.find(x=>x.n===(SUBJECTS[id].term||1)); if(!t) return 0;
  if(k<t.start) return 0;
  if(k>t.end) return 99;
  const w=weekOf(k);
  return w&&w.term===t.n?w.n:0;
}

/* ---------- campus, periods and holidays ---------- */
/* the campuses; a data file may bring its own (CAMPUS_NAMES: the guest's demo does) */
const CAMPUS=Object.assign({GET:"Getafe",LEG:"Leganés"},typeof CAMPUS_NAMES!=="undefined"?CAMPUS_NAMES:{});
const campusOf=id=>CAMPUS[SUBJECTS[id].campus]||SUBJECTS[id].campus;
const PERIOD_PRIORITY={break:0,exams:1,classes:2};
/* the period that rules a day (break > exams > classes) */
const periodOn=k=>CALENDAR.periods.filter(p=>k>=p.from&&k<=p.to)
  .sort((a,b)=>(PERIOD_PRIORITY[a.type]??9)-(PERIOD_PRIORITY[b.type]??9))[0]||null;
const holidayOn=k=>CALENDAR.holidays.find(h=>h.date===k)||null;

/* Why there is no class at all on a day, or null if it is a class day.
   A holiday for one campus does not count: there is class on the other one. */
function noClassReason(k){
  const dow=fromISO(k).getDay();
  if(dow===0||dow===6) return {why:"weekend", text:t("noClass.weekend")};
  const p=periodOn(k);
  if(p&&p.type==="break") return {why:"break", text:t("noClass.break",{name:p.label})};
  if(p&&p.type==="exams") return {why:"exams", text:p.label+"."};
  if(!p) return {why:"outside", text:t("noClass.outside")};
  const h=holidayOn(k);
  if(h&&!h.campus) return {why:"holiday", text:t("noClass.holiday")};
  return null;
}
/* Classes on a day, sorted by time. Respects breaks, exams,
   holidays and one-campus holidays. */
function classesOn(k){
  if(noClassReason(k)) return [];
  const day=fromISO(k).getDay()-1, h=holidayOn(k);
  return CLASSES.filter(c=>c.day===day
      && (c.dates ? c.dates.includes(k) : (k>=c.from && k<=c.to))
      && !(h&&h.campus&&SUBJECTS[c.subject].campus.toLowerCase()===h.campus))
    .sort((x,y)=>x.start-y.start);
}
/* where a class is on a given day: one-off classes may change room from one date to the next */
const roomOn=(c,k)=>c.rooms&&c.dates&&c.rooms[c.dates.indexOf(k)]||c.room;
/* state of a class at a given minute; the end minute is no longer "now" */
const classState=(c,m)=>m<c.start?"upcoming":m<c.end?"now":"over";

/* ---------- graded dates (EVENTS) ---------- */
const typeName=ty=>t("type."+ty);
const typeLong=ty=>t("typeLong."+ty);
const lastDay=e=>e.until||e.date;                     /* last day (multi-day windows) */
const weekNumber=e=>{ const w=weekOf(e.date); return w?w.n:null; };
const isAssessment=e=>e.type==="ex"||e.type==="en";
/* "Thu 24 Sep", "26–31 Oct", or the custom text of dates without a day */
function eventLabel(e){
  if(e.noDay){
    const w=weekOf(e.date);
    return e.label || (w?t("event.weekNoDay",{n:w.n}):t("event.noDay"));
  }
  if(e.until) return fmtRange(fromISO(e.date),fromISO(e.until));
  return fmtShort(fromISO(e.date));
}
/* how far it is, seen from day k: "today", "tomorrow", "in 6 days",
   "closes on Saturday" if the window is already open, "week 13" if it has no day */
function whenLabel(e,k){
  if(e.noDay){ const w=weekOf(e.date); return w?t("when.week",{n:w.n}):t("when.tbc"); }
  const d=daysBetween(k,e.date);
  if(e.until && d<=0){
    const r=daysBetween(k,e.until);
    return r===0?t("when.closesToday"):r===1?t("when.closesTomorrow"):t("when.openUntil",{day:dayName(fromISO(e.until))});
  }
  return d===0?t("when.today"):d===1?t("when.tomorrow"):t("when.inDays",{n:d});
}
/* does the event fall on day k? Dates without a day never "fall" on their parking Saturday */
const fallsOn=(e,k)=>!e.noDay && e.date<=k && lastDay(e)>=k;
const byDate=(a,b)=>a.date.localeCompare(b.date)||(a.noDay?1:0)-(b.noDay?1:0);

/* ---------- faculty: one role label for everyone ----------
   Leganés: one teacher for theory and exercises. Getafe: lectures and labs
   taught separately. Coordination is added on top. */
function roleParts(p){
  const r=[];
  if(p.role==="theory") r.push([t("role.theory"),"r-theory"]);
  if(p.role==="lecture") r.push([t("role.lecture"),"r-lecture"]);
  if(p.role==="lab") r.push([t("role.lab"),"r-lab"]);
  if(p.role==="lecture+lab"){ r.push([t("role.lecture"),"r-lecture"]); r.push([t("role.lab"),"r-lab"]); }
  if(p.role==="assistant") r.push([t("role.assistant"),"r-assistant"]);
  if(p.coord) r.push([t("role.coord"),"r-coord"]);
  return r;
}
const roleText=p=>roleParts(p).map(x=>x[0]).join(" · ");
function roleChips(p){
  const r=roleParts(p);
  return r.length?`<div class="roles">`+r.map(x=>`<span class="rol ${x[1]}">${x[0]}</span>`).join("")+`</div>`:"";
}

/* ---------- detail panel (Today and the planner) ---------- */
function showDetail(boxId, ev){
  const box=document.getElementById(boxId); if(!box) return;
  const S=SUBJECTS[ev.subject];
  const when=eventLabel(ev)+(ev.time?" · "+ev.time:"")+(ev.noDay&&ev.label&&!/confirm|TBC/i.test(ev.label)?" · "+t("detail.noDay"):"");
  const rows=[[t("detail.when"),when]];
  if(ev.room) rows.push([t("detail.where"),ev.room]);
  if(ev.format) rows.push([t("detail.format"),ev.format]);
  rows.push([t("detail.weight"),ev.weight]);
  if(ev.syllabus) rows.push([t("detail.covers"),ev.syllabus]);
  const w=weekOf(ev.date);
  box.hidden=false;
  box.style.borderLeftColor=S.color;
  box.innerHTML=`<div class="ev-head"><b style="color:${S.color}">${esc(t("detail.title",{type:typeLong(ev.type),subject:S.name}))}</b>`+
    `<button class="ev-close" aria-label="${esc(t("close"))}">×</button></div>`+
    `<div class="ev-meta">${esc(ev.what)}${w?" · "+t("when.week",{n:w.n}):""}</div>`+
    `<dl class="ev-dl">`+rows.map(r=>`<dt>${esc(r[0])}</dt><dd>${esc(r[1])}</dd>`).join("")+`</dl>`+
    (ev.syllabus||ev.type==="cf"||ev.type==="cl"?"":`<p class="nodata">${esc(t("detail.noSyllabus"))}</p>`);
  box.scrollIntoView({block:"nearest",behavior:lowMotion()?"auto":"smooth"});
}
/* closes a panel with its × or when clicking outside it */
function closeDetailOn(boxId, opener){
  document.addEventListener("click",ev=>{
    const box=document.getElementById(boxId); if(!box||box.hidden) return;
    if(ev.target.closest("#"+boxId+" .ev-close")){ box.hidden=true; return; }
    if(!ev.target.closest(opener) && !ev.target.closest("#"+boxId)) box.hidden=true;
  });
}

/* ---------- visible warning when something breaks ----------
   Data or code errors do not take the whole page down (each file runs on
   its own), but they are reported up here so they don't go unnoticed.
   Full details go to the console and the #debug panel. */
const REPORTED=[];
function reportProblem(text){
  REPORTED.push(text);
  const box=$("#errorBanner"); if(!box) return;
  box.hidden=false;
  box.querySelector("span").textContent=REPORTED.length===1?text:t("error.many",{n:REPORTED.length,first:REPORTED[0]});
}
window.addEventListener("error",e=>{
  const file=(e.filename||"").split("/").pop().split("?")[0]||t("error.page");
  reportProblem(t("error.inFile",{file,msg:e.message}));
});
