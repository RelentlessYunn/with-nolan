/* ==========================================================
   nolan.js — the Nolan section.
   Nolan's own month calendar: UC3M's exams plus his personal plans (PERSONAL,
   at the end of data.js: add a line there and it shows up here). Its design
   is in css/nolan.css; UC3M needs no changes.
   Home calls Nolan.render(box, subroute) when #nolan (or #nolan/whatever,
   for when Nolan has several pages) is opened.
   ========================================================== */
const Nolan={
  title:"Nolan",
  icon:`<svg class="i-crane" viewBox="0 0 48 48" aria-hidden="true">
    <path d="M12 44V10M16 44V12M12 40l4-4-4-4 4-4-4-4 4-4-4-4 4-4-4-4"/>
    <path d="M4 12h40M12 10 16 5l2 7M16 5 40 12"/>
    <rect class="f2" x="4.5" y="12.5" width="5" height="4.5" rx="1"/>
    <path d="M7 44h14"/>
    <g class="hook"><path d="M34 12v13"/><rect class="f" x="30" y="25" width="8" height="6.5" rx="1"/></g></svg>`,
  cal:null,
  render(box,subroute){
    if(!this.cal){                                   /* built once; later visits only redraw it (today moves on) */
      box.innerHTML=`<span class="p-ic" style="--ac:#FFA640">${this.icon}</span>`+
        `<h2>${esc(this.title)}</h2>`+
        `<p>${esc(t("nolan.lead"))}</p>`+
        `<div class="n-cal" id="nolan-grid"></div>`+
        `${backLink("#home","nolan.backAria")}`;
      this.cal=makePlanner($("#nolan-grid"),{detail:"nolan-detail",events:EVENTS.filter(e=>e.type==="ex"),
        personal:typeof PERSONAL!=="undefined"?PERSONAL:[]});
    } else this.cal.render();
  }
};
