/* ==========================================================
   sw.js — the offline copy (a service worker). The browser keeps it and
   it answers the page's requests when there is no connection.
   · The page (index.html): from the network first, so a new version is
     seen as soon as there is signal; without signal, the saved copy.
   · Its files (css, js, data, icons): they carry the version in their
     address (?v=0.82), so the saved copy is always right: served from
     here at once, which also makes the site open instantly.
   · What to keep is read from index.html itself (every href and src, plus
     the icons in the manifest): nothing to update by hand. Each time a
     fresh index.html arrives, files of older versions are dropped and the
     new ones fetched, so only one version is ever kept.
   · Fonts: the saved copy, refreshed in the background.
   · The cloud and the weather always go to the network (cloud.js and
     weather.js keep their own copies for offline).
   ========================================================== */
const CACHE="nolan", FONTS="nolan-fonts";
const BASE=new URL("./",self.location).href;           /* where the site lives */
const PAGE=BASE;                                         /* the saved page is kept under this address */

/* every file the page uses, from its own text */
async function wanted(html){
  const urls=new Set();
  const re=/(?:href|src)="([^"#]+)"/g; let m;
  while((m=re.exec(html))){ const u=new URL(m[1],BASE); if(u.origin===self.location.origin&&u.href!==PAGE) urls.add(u.href); }
  /* the icons listed in the manifest */
  const man=[...urls].find(u=>/manifest\.webmanifest/.test(u));
  if(man){
    try{ const r=await fetch(man,{cache:"no-cache"}); const j=await r.clone().json();
      (j.icons||[]).forEach(i=>urls.add(new URL(i.src,BASE).href));
      (await caches.open(CACHE)).put(man,r); }catch(e){}
  }
  return urls;
}
/* keep exactly this version: drop older files, fetch missing ones */
async function sync(html){
  const cache=await caches.open(CACHE), want=await wanted(html);
  const have=await cache.keys();
  await Promise.all(have.map(req=>req.url!==PAGE&&!want.has(req.url)?cache.delete(req):null));
  const got=new Set(have.map(r=>r.url));
  await Promise.all([...want].filter(u=>!got.has(u)).map(u=>cache.add(new Request(u,{cache:"no-cache"})).catch(()=>{})));
}

self.addEventListener("install",ev=>{
  ev.waitUntil((async()=>{
    const r=await fetch(PAGE,{cache:"no-cache"});
    if(r.ok){ await (await caches.open(CACHE)).put(PAGE,r.clone()); await sync(await r.text()); }
    await self.skipWaiting();
  })());
});
self.addEventListener("activate",ev=>{
  ev.waitUntil((async()=>{
    for(const k of await caches.keys()) if(k!==CACHE&&k!==FONTS) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener("fetch",ev=>{
  const req=ev.request;
  if(req.method!=="GET") return;
  const url=new URL(req.url);
  /* the page: network first, the saved copy without signal */
  if(req.mode==="navigate"&&url.origin===self.location.origin){
    ev.respondWith((async()=>{
      try{
        /* asked to the server, not to the browser's own cache: it could keep an old page for minutes */
        const r=await fetch(req.url,{cache:"no-cache",credentials:"same-origin"});
        if(r.ok&&(url.href===PAGE||/\/(index\.html)?$/.test(url.pathname))){
          const copy=r.clone();
          ev.waitUntil((async()=>{ await (await caches.open(CACHE)).put(PAGE,copy.clone()); await sync(await copy.text()); })());
        }
        return r;
      }catch(e){
        return (await caches.match(PAGE))||Response.error();
      }
    })());
    return;
  }
  /* the site's own files: the saved copy first (their address carries the version) */
  if(url.origin===self.location.origin){
    ev.respondWith((async()=>{
      const hit=await caches.match(req);
      if(hit) return hit;
      const r=await fetch(req);
      if(r.ok&&url.search) (await caches.open(CACHE)).put(req,r.clone());
      return r;
    })());
    return;
  }
  /* fonts: the saved copy, refreshed in the background */
  if(/fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)){
    ev.respondWith((async()=>{
      const cache=await caches.open(FONTS), hit=await cache.match(req);
      const net=fetch(req).then(r=>{ if(r.ok||r.type==="opaque") cache.put(req,r.clone()); return r; }).catch(()=>hit);
      return hit||net;
    })());
  }
  /* everything else (the cloud, the weather): straight to the network */
});
