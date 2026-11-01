import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, type Plugin} from 'vite';
import {createHash} from 'crypto';

/** يولّد sw.js بقائمة كل ملفات البناء ليعمل الموقع بلا إنترنت بعد أول زيارة. */
function offlineWorker(): Plugin {
  return {
    name: 'offline-worker',
    apply: 'build',
    generateBundle(_opts, bundle) {
      const files = Object.keys(bundle).filter((f) => f !== 'sw.js' && !f.endsWith('.woff'));
      const urls = ['/', '/favicon.svg', '/manifest.webmanifest', '/icons/icon-192.png', '/icons/icon-512.png', '/icons/maskable-512.png', ...files.map((f) => '/' + f)];
      const version = createHash('sha1').update(urls.join('|')).digest('hex').slice(0, 10);
      const source = `const CACHE = 'font-studio-${version}';
const URLS = ${JSON.stringify(urls)};

self.addEventListener('install', (e) => {
  // لا skipWaiting: النسخة الجديدة تنتظر إغلاق التبويبات حتى لا تختلط ملفات قديمة بجديدة
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(URLS)));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).catch(() => caches.match('/', { ignoreVary: true }).then((r) => r || Response.error()))
    );
    return;
  }
  e.respondWith(
    caches.match(req, { ignoreVary: true }).then((hit) => hit || fetch(req).then((res) => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
      return res;
    }))
  );
});
`;
      this.emitFile({type: 'asset', fileName: 'sw.js', source});
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), offlineWorker()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
