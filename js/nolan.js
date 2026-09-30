/* ==========================================================
   nolan.js — the Nolan section: built like the UC3M app (its header with
   the logo, the clock, the date and the week) but with a single window,
   the month planner. It shows every UC3M event, his own plans (PERSONAL, at
   the end of data.js: one line each) and every event added with its "+"
   (planner.js, MyEvents). Its design is in css/nolan.css.
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
      box.innerHTML=
        `<div class="n-head">`+
          `<div class="hdr-top"><div class="hdr-left">`+
            `<a class="icon home-btn" href="#home" aria-label="${esc(t("nolan.backAria"))}" title="${esc(t("nolan.backAria"))}">${LOGO_SVG}</a>`+
            `<span class="brand">${esc(t("nolan.brand"))}</span></div></div>`+
          `<div class="hdr-main"><div class="clock"><div class="clock-time n-time"></div><div class="clock-date n-date"></div></div>`+
            `<div class="hdr-meta"><div class="week-badge n-week"></div></div></div>`+
        `</div>`+
        `<section class="n-month"><div class="shead"><h2>${esc(t("nolan.planner"))}</h2><p>${esc(t("nolan.lead"))}</p></div>`+
        `<div id="nolan-grid"></div></section>`;
      this.cal=makePlanner($("#nolan-grid"),{detail:"nolan-detail",events:EVENTS,
        personal:typeof PERSONAL!=="undefined"?PERSONAL:[],mine:()=>MyEvents.list(),where:"nolan"});
      /* the clock, the date and the week are the app header's own (header.js keeps them right) */
      const tick=()=>{
        const n=new Date(), hm=String(n.getHours()).padStart(2,"0")+":"+String(n.getMinutes()).padStart(2,"0");
        const put=(sel,v,html)=>{ const el=box.querySelector(sel); if(el&&(html?el.innerHTML:el.textContent)!==v) html?el.innerHTML=v:el.textContent=v; };
        put(".n-time",hm); put(".n-date",($("#clockDate")||{}).textContent||""); put(".n-week",($("#weekBadge")||{}).innerHTML||"",true);
      };
      tick(); document.addEventListener("minute",tick); document.addEventListener("newDay",tick);
      this.tick=tick;
    } else { this.cal.render(); this.tick(); }
  }
};
