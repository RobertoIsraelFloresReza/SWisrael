const CACHE_NAME = 'SWisrael-v1.0';

self.addEventListener('install', event => {
    console.log('[SW] Instalando...');
    self.skipWaiting();
    self.clients.matchAll({ includeUncontrolled: true, type: 'window' }).then(clientList => {
        clientList.forEach(client => {
            client.postMessage({
                type: 'LOG_EVENT',
                name: 'Instalado',
                status: 'installed'
            });
        });
    });
});

self.addEventListener('activate', event => {
    console.log('[SW] Activando...');
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log(`[SW] Eliminando caché antiguo: ${cacheName}`);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    
    self.clients.matchAll({ includeUncontrolled: true, type: 'window' }).then(clientList => {
        clientList.forEach(client => {
            client.postMessage({
                type: 'LOG_EVENT',
                name: 'Activación',
                status: 'activating'
            });
        });
    });
});

self.addEventListener('fetch', event => {
    if (event.request.mode === 'navigate') {
        self.clients.matchAll({ includeUncontrolled: true, type: 'window' }).then(clientList => {
            clientList.forEach(client => {
                client.postMessage({
                    type: 'LOG_EVENT',
                    name: 'Fetch/Navegación',
                    status: 'fetching'
                });
            });
        });
    }
});