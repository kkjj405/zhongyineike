/* 中医内科学 · Service Worker（离线优先，全量预缓存）
 * 版本缓存：1.0.5
 * 资源清单由 build_pwa.py 自动生成，共 16 项。
 */
const CACHE = 'znk-zhongyineike-v1.0.5';
const ASSETS = [
  "./app.css",
  "./index.html",
  "./manifest.webmanifest",
  "./qr.jpg",
  "./data/diseases.js",
  "./icons/apple-touch-icon.png",
  "./icons/icon-192.png",
  "./icons/icon-512-maskable.png",
  "./icons/icon-512.png",
  "./js/boot.js",
  "./js/cards.js",
  "./js/core.js",
  "./js/misc.js",
  "./js/practice.js",
  "./js/ui.js",
  "./js/version.js"
];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) {
    // 单个资源失败不阻塞整体安装（下次 fetch 时会自然回填）
    return Promise.all(ASSETS.map(function (u) {
      return c.add(new Request(u, { cache: 'reload' })).catch(function () {});
    }));
  }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== CACHE; })
      .map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener('fetch', function (e) {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;   // 跨域请求不接管
  // version.json / files.json 是「检查更新」用的网络探测文件：
  // 既不在预缓存清单里，也绝不写入缓存，否则永远读到旧版本。
  if (/(^|\/)(version|files)\.json$/.test(url.pathname)) {
    e.respondWith(fetch(new Request(req, { cache: 'no-store' })));
    return;
  }
  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then(function (hit) {
      if (hit) return hit;
      return fetch(req).then(function (res) {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put(req, copy); }).catch(function () {});
        }
        return res;
      }).catch(function () {
        return caches.match('./index.html');
      });
    })
  );
});
