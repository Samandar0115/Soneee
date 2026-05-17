// Kill switch: avvalgi keshlangan SW (soneee-crm-v1) yangi deploy fayllarini topa olmay,
// foydalanuvchini "oq ekran"ga olib kelar edi. Bu SW har gal o'zini va kesh ma'lumotlarini
// o'chiradi, shu tariqa keyingi sahifa yuklanishida bevosita Vercel'dan yangi versiya tushadi.

self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', async (e) => {
  e.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
      const regs = await self.registration.unregister();
      const clientsList = await self.clients.matchAll({ type: 'window' });
      clientsList.forEach((client) => client.navigate(client.url));
    })()
  );
});

self.addEventListener('fetch', (e) => {
  // Hech narsa keshlamaslik — to'g'ridan-to'g'ri tarmoqdan.
  e.respondWith(fetch(e.request).catch(() => new Response('', { status: 503 })));
});
