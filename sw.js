/* 오프라인 캐시 (서비스 워커)
 * - 처음 열 때 앱 파일과 모든 코스 데이터를 저장해 두고, 다음부터는 인터넷 없이도 열려요.
 * - 열 때마다 저장본을 먼저 보여 주고, 뒤에서 새 파일을 받아 저장본을 바꿔 둬요.
 *   그래서 문제를 고쳐 배포하면 "다음번" 실행 때 반영돼요.
 * - js/app.js나 css처럼 앱 자체를 크게 고쳤다면 아래 VERSION을 올려 주세요.
 *   옛 저장본을 지우고 처음부터 새로 받아요.
 */
const VERSION = "v2";
const CACHE = "csharp-week-" + VERSION;
const APP_FILES = [
  "./",
  "index.html",
  "css/style.css",
  "js/app.js",
  "manifest.json",
  "data/courses.json",
  "icons/icon.svg",
  "icons/icon-192.png",
  "icons/icon-512.png"
];
const FONT_HOSTS = ["fonts.googleapis.com", "fonts.gstatic.com"];

self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    const fresh = url => new Request(url, { cache: "reload" });
    await cache.addAll(APP_FILES.map(fresh));
    // 코스 데이터 파일은 courses.json에 적힌 목록을 보고 같이 저장해요. (코스를 추가해도 여기는 안 고쳐도 돼요)
    const courses = await (await fetch(fresh("data/courses.json"))).json();
    await cache.addAll(courses.map(c => fresh(c.file)));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) {
      if (key.startsWith("csharp-week-") && key !== CACHE) await caches.delete(key);
    }
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", event => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;
  if (!sameOrigin && !FONT_HOSTS.includes(url.hostname)) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(req, { ignoreSearch: sameOrigin });
    const network = fetch(req).then(res => {
      if (res.ok || res.type === "opaque") cache.put(req, res.clone());
      return res;
    });
    if (cached) {
      event.waitUntil(network.catch(() => {}));   // 뒤에서 새로 받아 저장본 갱신
      return cached;
    }
    try {
      return await network;
    } catch (e) {
      // 오프라인인데 저장본이 없는 페이지 요청이면 앱 첫 화면을 보여 줘요
      if (req.mode === "navigate") return (await cache.match("index.html")) || Response.error();
      throw e;
    }
  })());
});
