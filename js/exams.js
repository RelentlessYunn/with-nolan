/* ==========================================================
   exams.js — table with everything graded in the term, with filters by
   type and by subject. Past items are dimmed.
   ========================================================== */
(function(){
  const ids=subjectsOn(todayISO());
  const evs=EVENTS.filter(e=>ids.includes(e.subject)).sort(byDate);
  const types=["all","type_ex","type_en","type_cl","type_cf"];
  let current="all";
  const bar=$("#examFilters");
  bar.innerHTML=types.map(k=>`<button data-k="${k}" aria-pressed="${k===current}">${esc(t("exams.filter."+k))}</button>`).join("")+
    '<span class="sep" aria-hidden="true"></span>'+
    ids.filter(k=>evs.some(e=>e.subject===k)).map(k=>`<button data-k="${k}" aria-pressed="false"><i class="sw" style="background:${SUBJECTS[k].color}"></i>${esc(SUBJECTS[k].name)}</button>`).join("");

  function render(){
    const today=todayISO();
    const rows=evs.filter(e=>current==="all"||(current.startsWith("type_")?e.type===current.slice(5):e.subject===current));
    $("#examRows").innerHTML=rows.length?rows.map(e=>{
      const w=weekNumber(e), S=SUBJECTS[e.subject];
      return `<tr${lastDay(e)<today?' class="past"':""}><td class='num'><b>${esc(eventLabel(e))}</b></td>`+
        `<td class='num' style='color:var(--ink-3)'>${w?t("exams.weekShort",{n:w}):"—"}</td>`+
        `<td><span class='sw' style='background:${S.color}'></span>${esc(S.name)}</td><td>${esc(e.what)}</td>`+
        `<td><span class='pill p-${e.type}'>${esc(e.weight)}</span></td></tr>`;
    }).join(""):`<tr><td colspan='5' class='nodata'>${esc(t("exams.none"))}</td></tr>`;
  }
  bar.addEventListener("click",ev=>{
    const b=ev.target.closest("button"); if(!b) return;
    current=b.dataset.k;
    $$("#examFilters button").forEach(x=>x.setAttribute("aria-pressed",String(x===b)));
    render();
  });
  document.addEventListener("newDay",render);
  render();

  /* "Add to my calendar" (js/ics.js): how many go in, how many still wait for their day */
  const icsNote=()=>{ const pending=icsPending(); $("#icsNote").textContent=t("ics.note",{n:icsEvents().length})+(pending?" "+t("ics.pending",{n:pending}):""); };
  icsNote(); document.addEventListener("newDay",icsNote);
  $("#icsButton").addEventListener("click",downloadICS);
})();
