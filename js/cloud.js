/* ==========================================================
   cloud.js — saving to JSONBin (ticked tasks, exam grades, notes for Claude, your calendar events).
   Rules, so nothing is ever lost:
   · Until the first read has succeeded nothing is written: it retries and
     your changes wait in a queue.
   · Saves are CHANGES (this task done, this grade) applied to a fresh re-read,
     so nothing you didn't touch — or another device changed — is overwritten.
   · Writes go one after another.
   · Pending changes are flushed when the app is hidden or closed.
   · Offline: the last copy read is kept on this device (localStorage), so the
     page shows your ticks, grades and notes without a connection; changes
     made meanwhile are kept on the device too (as small descriptions, OPS
     below) and go up when the connection comes back, even after closing.
   Stored keys ("hechas", "grades", "notas", "eventos") are kept as they were so old data still loads.
   Usage from other files:
     Cloud.onLoad((rec,info)=>…)     called with the data (and again if refreshed); first with
                                     this device's last copy (info.copy) if there is one
     Cloud.change("key", {op,args})  queues a change kept on the device until saved
     Cloud.change("key", rec=>…)     the same, only in memory (one-off migrations)
     (the last change with the same key wins)
   Status: "cloud" event with {kind, text}.
   ========================================================== */
const Cloud=(function(){
  const cfg=window.CONFIG||{}, ID=cfg.BIN_ID||"", KEY=cfg.API_KEY||"";
  const URL_BIN="https://api.jsonbin.io/v3/b/"+ID;
  const enabled=!!(ID&&KEY);
  let record=null, ready=false, retry=2000, timer=null, hiddenSince=0;
  let queue=Promise.resolve();
  const pending=new Map();          /* key → function that applies the change to a record */
  const listeners=[];
  const copy=o=>JSON.parse(JSON.stringify(o||{}));
  const status=(kind,text)=>emit("cloud",{kind,text});
  const headers={"X-Access-Key":KEY};
  /* the changes that can be kept on the device: described, not as code */
  const OPS={
    done:(rec,a)=>{ const s=new Set(rec.hechas||[]); if(a.done) s.add(a.id); else s.delete(a.id); rec.hechas=[...s]; },
    grade:(rec,a)=>{ rec.grades=rec.grades||{}; if(a.text==="") delete rec.grades[a.id]; else rec.grades[a.id]=a.text; },
    notes:(rec,a)=>{ rec.notas=a.text; },
    /* your own calendar events (planner.js): one change per event, so two devices never undo each other */
    event:(rec,a)=>{ rec.eventos=rec.eventos||{}; if(a.ev) rec.eventos[a.id]=a.ev; else delete rec.eventos[a.id]; }
  };
  const REC_KEY="nolan-cloud", PEND_KEY="nolan-pending";
  const kept=new Map();             /* key → {op,args}: pending changes also on the device */
  const store=(k,v)=>{ try{ localStorage.setItem(k,JSON.stringify(v)); }catch(e){} };
  const stored=k=>{ try{ return JSON.parse(localStorage.getItem(k)||"null"); }catch(e){ return null; } };
  const keep=()=>store(PEND_KEY,[...kept]);
  const remember=rec=>store(REC_KEY,rec);
  /* what was left pending last time (the app closed offline): back in the queue */
  (stored(PEND_KEY)||[]).forEach(([k,c])=>{ if(c&&OPS[c.op]){ kept.set(k,c); pending.set(k,rec=>OPS[c.op](rec,c.args)); } });
  let shown="", loadTimer=0, started=false;       /* shown: "" · "copy" (the device's, read-only) · "offline" · "fresh" */

  async function read(){
    const r=await fetch(URL_BIN+"/latest",{headers,cache:"no-store"});
    if(!r.ok) throw new Error("HTTP "+r.status);
    return (await r.json()).record||{};
  }
  /* what was read plus what is still queued: that is what the screen must show.
     info.copy: it is only this device's last copy, shown while the fresh one is read */
  function view(rec){ const v=copy(rec); pending.forEach(fn=>fn(v)); return v; }
  function hand(rec,info){
    const v=view(rec);
    listeners.forEach(fn=>{ try{ fn(v,info||{}); }catch(e){ console.error(e); } });
  }

  function load(){
    if(!enabled){ status("off",t("cloud.off")); return; }
    status("loading",t("cloud.loading"));
    clearTimeout(loadTimer);
    /* the copy kept on this device shows at once, while the fresh one is read: your ticks, grades
       and notes are there from the start, and the fresh read only changes what did change */
    if(!shown){ const c=stored(REC_KEY); if(c){ shown="copy"; hand(c,{copy:true}); } }
    read().then(rec=>{
      record=rec; ready=true; retry=2000; remember(rec);
      shown="fresh"; hand(rec);
      status("ok",t("cloud.synced"));
      if(pending.size) schedule();
    }).catch(()=>{
      /* no connection: the copy kept on this device, now to work with (it goes up when the connection is back) */
      const copyRec=stored(REC_KEY);
      if(copyRec&&shown!=="offline"&&shown!=="fresh"){ shown="offline"; hand(copyRec); }
      status("error",navigator.onLine===false?t("cloud.offline"):t("cloud.retrying",{s:Math.round(retry/1000)}));
      loadTimer=setTimeout(load,retry); retry=Math.min(retry*2,60000);
    });
  }
  /* back in the app after a while: re-read in case another device changed something */
  function refresh(){
    read().then(rec=>{ if(pending.size) return; record=rec; remember(rec); hand(rec); }).catch(()=>{});
  }

  function schedule(){ clearTimeout(timer); timer=setTimeout(write,800); }
  function write(){
    if(!ready||!pending.size) return queue;
    const batch=new Map(pending); pending.clear();
    queue=queue.then(async()=>{
      try{
        const rec=await read();
        batch.forEach(fn=>fn(rec));
        const r=await fetch(URL_BIN,{method:"PUT",headers:{...headers,"Content-Type":"application/json"},body:JSON.stringify(rec)});
        if(!r.ok) throw new Error("HTTP "+r.status);
        record=rec; remember(rec);
        batch.forEach((fn,k)=>{ if(!pending.has(k)) kept.delete(k); }); keep();
        status(pending.size?"saving":"ok",pending.size?t("cloud.saving"):t("cloud.saved"));
      }catch(e){
        /* back to the queue, without overwriting a newer change with the same key */
        batch.forEach((fn,k)=>{ if(!pending.has(k)) pending.set(k,fn); });
        status("error",navigator.onLine===false?t("cloud.offline"):t("cloud.saveFailed"));
        setTimeout(schedule,5000);
      }
    });
    return queue;
  }
  /* when the app is hidden or closed there is no time to re-read: write over the last copy */
  function flushOnExit(){
    if(!ready||!pending.size||!record) return;
    const rec=view(record);
    try{
      fetch(URL_BIN,{method:"PUT",keepalive:true,headers:{...headers,"Content-Type":"application/json"},body:JSON.stringify(rec)});
    }catch(e){}
  }
  document.addEventListener("visibilitychange",()=>{
    if(document.hidden){ hiddenSince=Date.now(); flushOnExit(); }
    else if(ready&&Date.now()-hiddenSince>60000) refresh();
  });
  window.addEventListener("pagehide",flushOnExit);
  /* the connection is back: read (or save) now, not at the next retry */
  window.addEventListener("online",()=>{ if(!enabled||!started) return; if(!ready){ retry=2000; load(); } else if(pending.size) schedule(); });

  /* read once every file has loaded and everyone is listening, and only once the PIN is right:
     nothing of yours is read behind the PIN screen, nor for a guest (gate.js) */
  Gate.onOpen(()=>{
    if(started||Gate.guest()) return;
    started=true;
    if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",load); else setTimeout(load,0);
  });
  return {
    enabled,
    ready:()=>ready,
    onLoad(fn){ listeners.push(fn); if(ready&&record) fn(view(record),{}); },
    change(key,fn){
      if(fn&&typeof fn==="object"){ const c=fn; if(!OPS[c.op]) return; fn=rec=>OPS[c.op](rec,c.args); kept.set(key,c); keep(); }
      else if(kept.delete(key)) keep();
      pending.set(key,fn);
      if(!enabled) return;
      if(!ready){ status("waiting",t("cloud.waiting")); return; }
      status("saving",t("cloud.saving")); schedule();
    }
  };
})();
