
const CACHE_NAME = "parcelmate-v2";

const FILES_TO_CACHE = [
    "/",
    "/settings",
    "/static/style.css",
    "/static/script.js",
    "/static/settings.js",
    "/static/pwa.js",
    "/static/manifest.json"
];


// ========================================
// 1. INSTALL SERVICE WORKER
// ========================================

self.addEventListener("install", function (event) {

    event.waitUntil(
        caches.open(CACHE_NAME).then(function (cache) {
            return cache.addAll(FILES_TO_CACHE);
        })
    );

    self.skipWaiting();
});


// ========================================
// 2. ACTIVATE SERVICE WORKER
// ========================================

self.addEventListener("activate", function (event) {

    event.waitUntil(
        caches.keys().then(function (cacheNames) {

            return Promise.all(
                cacheNames.map(function (cacheName) {

                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }

                })
            );

        })
    );

    self.clients.claim();
});


// ========================================
// 3. FETCH LATEST FILES
// ========================================

self.addEventListener("fetch", function (event) {

    if (event.request.method !== "GET") {
        return;
    }

    const url = new URL(event.request.url);

    // Always get fresh HTML pages from Flask
    if (
        url.origin === self.location.origin &&
        (url.pathname === "/" || url.pathname === "/settings")
    ) {
        event.respondWith(
            fetch(event.request).catch(function () {
                return caches.match(event.request);
            })
        );

        return;
    }

    // Use cache for static files, and update it in the background
    if (url.origin === self.location.origin) {

        event.respondWith(
            caches.open(CACHE_NAME).then(async function (cache) {

                const cachedResponse = await cache.match(event.request);

                const networkResponse = fetch(event.request).then(
                    function (response) {

                        if (response.ok) {
                            cache.put(event.request, response.clone());
                        }

                        return response;
                    }
                );

                return cachedResponse || networkResponse;

            })
        );
    }

});
