/* ==========================================================
   smooth.js — smooth scrolling (Settings → Smooth scrolling, on by default).
   A mouse wheel moves the page in steps; here each step sets where the page
   should get to, and it glides there, easing out, frame by frame. The same for
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

  const moving=new Map();                                     /* element → {to, at, last} */
  function step(el,now){
    const m=moving.get(el); if(!m) return;
    /* someone else moved it (the scrollbar, a key, the code): start from there */
    if(Math.abs(el.scrollTop-m.last)>2){ m.at=el.scrollTop; m.to=el.scrollTop+(m.to-m.last); }
    const dt=Math.min(.05,(now-(m.t||now))/1000)||.016; m.t=now;
    m.at+=(m.to-m.at)*(1-Math.exp(-dt*11));
    const max=el.scrollHeight-el.clientHeight;
    m.to=Math.max(0,Math.min(max,m.to));
    if(Math.abs(m.to-m.at)<.5){ el.scrollTop=m.to; moving.delete(el); return; }
    el.scrollTop=m.at; m.last=el.scrollTop;
    requestAnimationFrame(t=>step(el,t));
  }

  addEventListener("wheel",ev=>{
    if(!on()||ev.defaultPrevented||ev.ctrlKey||ev.metaKey) return;
    if(Math.abs(ev.deltaX)>Math.abs(ev.deltaY)||ev.shiftKey) return;              /* sideways: as it is */
    /* a trackpad sends many small, uneven steps and glides by itself: left alone */
    if(ev.deltaMode===0&&Math.abs(ev.deltaY)<40&&!Number.isInteger(ev.deltaY/10)) return;
    const dy=ev.deltaY*(ev.deltaMode===1?40:ev.deltaMode===2?innerHeight*.9:1);
    const el=scroller(ev.target,dy); if(!el) return;
    ev.preventDefault();
    let m=moving.get(el);
    if(!m){ m={at:el.scrollTop,to:el.scrollTop,last:el.scrollTop}; moving.set(el,m); requestAnimationFrame(t=>step(el,t)); }
    m.to+=dy;
  },{passive:false});

  return {on};
})();
