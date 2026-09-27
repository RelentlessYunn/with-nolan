/* ==========================================================
   smooth.js — smooth scrolling (Settings → Smooth scrolling, off by default).
   A mouse wheel moves the page in steps; here each step sets where the page
   should get to, and the browser glides it there (its own smooth scrolling,
   which runs apart from the page, so it never stutters). The same for
   anything that scrolls inside the page (home's window, a list…): whatever is
   under the pointer and can still move that way.
   Left alone: trackpads and phones (they already glide, with their own
   momentum), zooming (Ctrl + wheel), text boxes, sideways scrolling, and
   reduced motion (Settings or the system).
   ========================================================== */
const Smooth=(function(){
  const on=()=>SETTINGS.scroll!=="native"&&!lowMotion();
  const root=document.documentElement;
  const mark=()=>root.dataset.scroll=on()?"smooth":"native";
  mark();
  document.addEventListener("settings",e=>{ if(e.detail&&e.detail.key==="scroll") mark(); });

  /* what should scroll: the nearest thing under the pointer that can still move that way */
  function scroller(el,dy){
    for(let n=el;n&&n!==document.body&&n!==root;n=n.parentElement){
      if(n.matches&&n.matches("textarea,input,select,[contenteditable]")) return null;
      const s=getComputedStyle(n);
      if(!/(auto|scroll)/.test(s.overflowY)||n.scrollHeight<=n.clientHeight+1) continue;
      const room=dy>0?n.scrollHeight-n.clientHeight-n.scrollTop:n.scrollTop;
      if(room>.5) return n;
      if(s.overscrollBehaviorY==="contain") return n;          /* it keeps the wheel even at its end */
    }
    return document.scrollingElement||root;
  }

  /* the glide itself is the browser's (a smooth scrollTo): it runs off the page's own thread, so a busy
     frame of the universe never makes it stutter. Each notch only moves where it is heading */
  const heading=new WeakMap();                                 /* element → {to, at} */
  addEventListener("wheel",ev=>{
    if(!on()||ev.defaultPrevented||ev.ctrlKey||ev.metaKey) return;
    if(Math.abs(ev.deltaX)>Math.abs(ev.deltaY)||ev.shiftKey) return;              /* sideways: as it is */
    /* a trackpad sends many small, uneven steps and glides by itself: left alone */
    if(ev.deltaMode===0&&Math.abs(ev.deltaY)<40&&!Number.isInteger(ev.deltaY/10)) return;
    const dy=ev.deltaY*(ev.deltaMode===1?40:ev.deltaMode===2?innerHeight*.9:1);
    const el=scroller(ev.target,dy); if(!el) return;
    ev.preventDefault();
    const now=performance.now(), max=el.scrollHeight-el.clientHeight;
    let h=heading.get(el);
    if(!h||now-h.at>450||Math.abs(el.scrollTop-h.to)>innerHeight*2) h={to:el.scrollTop};   /* (moved some other way meanwhile) */
    h.to=Math.max(0,Math.min(max,h.to+dy)); h.at=now; heading.set(el,h);
    el.scrollTo({top:h.to,behavior:"smooth"});
  },{passive:false});

  return {on};
})();
