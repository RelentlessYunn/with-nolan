/* ==========================================================
   validate.js — checks data.js and eval.js before anything is rendered.
   · Anything that would break the page (unknown subject, badly written
     date…) is removed, reported at the top and in the console; the rest works.
   · Anything merely odd (an exam on a holiday, two coordinators…) is
     reported in the console and in the #debug panel.
   Messages are for the developer, so they are always in English.
   ========================================================== */
const CHECK={errors:[],warnings:[]};
(function(){
  const error=m=>CHECK.errors.push(m), warn=m=>CHECK.warnings.push(m);
  const isDate=k=>typeof k==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(k)&&isoDate(fromISO(k))===k;
  const DAY_EN=["Monday","Tuesday","Wednesday","Thursday","Friday"];
  /* drops the entries of a list that fail the test, reporting each one */
  function keep(list,name,test){
    for(let i=list.length-1;i>=0;i--){
      const problem=test(list[i]);
      if(problem){ error(`${name} #${i+1}: ${problem}. Left out.`); list.splice(i,1); }
    }
  }

  /* subjects */
  Object.keys(SUBJECTS).forEach(k=>{
    const S=SUBJECTS[k];
    ["name","short","color","tint","campus"].forEach(f=>{ if(!S[f]) error(`SUBJECTS.${k}: missing "${f}".`); });
    if(S.campus&&!CAMPUS[S.campus]) warn(`SUBJECTS.${k}: unknown campus "${S.campus}" (GET or LEG).`);
    if(!TERMS.some(x=>x.n===(S.term||1))) warn(`SUBJECTS.${k}: term ${S.term} is not in TERMS.`);
    /* without grading the card cannot be drawn: an empty one is used */
    const G=GRADING[k];
    if(!G){ error(`GRADING.${k}: missing. The card is shown without grading.`); GRADING[k]={parts:[],rules:[],minimum:t("subject.noGrading")}; return; }
    if(!Array.isArray(G.rules)){ warn(`GRADING.${k}: missing "rules".`); G.rules=[]; }
    if(typeof G.minimum!=="string"){ warn(`GRADING.${k}: missing "minimum".`); G.minimum=""; }
    if(G.parts){
      const sum=G.parts.reduce((s,p)=>s+p[1],0);
      if(Math.abs(sum-100)>.01) warn(`GRADING.${k}: parts add up to ${sum}, not 100.`);
    }
  });
  Object.keys(GRADING).forEach(k=>{ if(!SUBJECTS[k]) warn(`GRADING.${k}: no such subject.`); });

  /* timetable */
  keep(CLASSES,"CLASSES",c=>{
    if(!SUBJECTS[c.subject]) return `unknown subject "${c.subject}"`;
    if(!(c.day>=0&&c.day<=4)) return `day ${c.day} is not Monday (0) to Friday (4)`;
    if(!(c.start<c.end)) return `starts (${c.start}) after it ends (${c.end})`;
    if(c.dates){ const bad=c.dates.find(x=>!isDate(x)); if(bad) return `badly written date "${bad}"`; }
    else if(!isDate(c.from)||!isDate(c.to)) return `"from"/"to" missing or badly written`;
    return null;
  });
  CLASSES.forEach(c=>{ if(c.dates) c.dates.forEach(x=>{
    if(fromISO(x).getDay()-1!==c.day) warn(`Class of ${SUBJECTS[c.subject].short}: ${x} is not a ${DAY_EN[c.day]}.`);
  }); });

  /* faculty */
  keep(FACULTY,"FACULTY",p=>SUBJECTS[p.subject]?null:`unknown subject "${p.subject}"`);
  Object.keys(SUBJECTS).forEach(k=>{
    const coords=FACULTY.filter(p=>p.subject===k&&p.coord);
    if(coords.length>1) warn(`${SUBJECTS[k].name}: ${coords.length} coordinators (${coords.map(p=>p.name).join(", ")}). There can only be one.`);
    if(!coords.length) warn(`${SUBJECTS[k].name}: no coordinator.`);
    if(!FACULTY.some(p=>p.subject===k&&p.role)) warn(`${SUBJECTS[k].name}: nobody teaches it.`);
  });

  /* graded dates */
  keep(EVENTS,"EVENTS",e=>{
    if(!SUBJECTS[e.subject]) return `unknown subject "${e.subject}"`;
    if(!["ex","en","cl","cf"].includes(e.type)) return `unknown type "${e.type}" (ex, en, cl or cf)`;
    if(!isDate(e.date)) return `badly written date "${e.date}"`;
    if(e.until&&(!isDate(e.until)||e.until<e.date)) return `"until" (${e.until}) badly written or before the date`;
    if(!e.what) return `missing "what"`;
    return null;
  });
  EVENTS.filter(e=>!e.noDay).forEach(e=>{
    const S=SUBJECTS[e.subject], txt=`${S.short} · "${e.what.slice(0,40)}" (${e.date})`;
    const reason=noClassReason(e.date);
    /* (an exam in the exam period is just where it belongs) */
    if(reason&&reason.why!=="weekend"&&!e.online&&!(reason.why==="exams"&&e.type==="ex")) warn(`${txt}: there is no class that day (${reason.why}).`);
    else if(!reason&&!e.online&&e.type!=="cf"&&!classesOn(e.date).some(c=>c.subject===e.subject))
      warn(`${txt}: no ${S.short} class that day.`);
  });

  /* tasks */
  Object.keys(TASKS).forEach(k=>{ if(!SUBJECTS[k]){ error(`TASKS.${k}: unknown subject. Left out.`); delete TASKS[k]; } });
  const dupes=(list,where)=>{ const seen=new Set(); list.forEach(x=>{ const s=slug(x[0]);
    if(seen.has(s)) warn(`${where}: two tasks share the title "${x[0]}"; their ticks would get mixed up.`); seen.add(s); }); };
  Object.keys(TASKS).forEach(k=>dupes(TASKS[k],`TASKS.${k}`));
  dupes(GENERAL_TASKS,"GENERAL_TASKS");

  if(CHECK.errors.length){
    console.error("Data errors (left out so the page keeps working):\n- "+CHECK.errors.join("\n- "));
    reportProblem(t("error.data",{n:CHECK.errors.length,first:CHECK.errors[0]}));
  }
  if(CHECK.warnings.length) console.warn("Data to review:\n- "+CHECK.warnings.join("\n- "));
})();
