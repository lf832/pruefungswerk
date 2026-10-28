/* Prüfungswerk Service Worker — network-first, damit Updates sofort ankommen */
const CACHE='pruefungswerk-static-v50';
const FILES=['./','./index.html','./styles.css','./app.js','./manifest.webmanifest','./icon.svg','./wissen.json'];
self.addEventListener('install',e=>{e.waitUntil((async()=>{const c=await caches.open(CACHE);await Promise.all(FILES.map(f=>c.add(new Request(f,{cache:'reload'})).catch(()=>{})));await self.skipWaiting()})())});
self.addEventListener('activate',e=>{e.waitUntil((async()=>{const ks=await caches.keys();await Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)));await self.clients.claim()})())});
self.addEventListener('fetch',e=>{const req=e.request;if(req.method!=='GET')return;let u;try{u=new URL(req.url)}catch(err){return}if(u.origin!==self.location.origin)return;
  e.respondWith((async()=>{try{const res=await fetch(req,{cache:'no-cache'});if(res&&res.ok&&res.type==='basic'){const copy=res.clone();caches.open(CACHE).then(c=>c.put(req,copy)).catch(()=>{})}return res}catch(err){const hit=await caches.match(req);if(hit)return hit;if(req.mode==='navigate'){const idx=await caches.match('./index.html');if(idx)return idx}return new Response('Offline',{status:503,headers:{'Content-Type':'text/plain;charset=utf-8'}})}})())});
