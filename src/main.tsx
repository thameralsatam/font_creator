import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/ibm-plex-sans-arabic/arabic-100.css';
import '@fontsource/ibm-plex-sans-arabic/arabic-200.css';
import '@fontsource/ibm-plex-sans-arabic/arabic-300.css';
import '@fontsource/ibm-plex-sans-arabic/arabic-400.css';
import '@fontsource/ibm-plex-sans-arabic/latin-300.css';
import '@fontsource/ibm-plex-sans-arabic/latin-400.css';
import '@fontsource/kufam/arabic-400.css';
import '@fontsource/kufam/latin-400.css';
import '@fontsource/jetbrains-mono/latin-300.css';
import '@fontsource/jetbrains-mono/latin-400.css';
import './index.css';
import { initLang } from './i18n';

// اللغة تُحدَّد وتُحمَّل ترجمتها قبل تحميل أي وحدة فيها نصوص (ثوابت الوحدات تُترجم لحظة التحميل)
void initLang().then(async () => {
  const [{ default: App }, { ErrorBoundary }] = await Promise.all([
    import('./App'),
    import('./components/ErrorBoundary'),
  ]);
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </StrictMode>
  );
});

// تسجيل عامل الخدمة في النسخة المبنية فقط، ليعمل الموقع بلا إنترنت
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}
