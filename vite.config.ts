import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/** Vite expects `base` to end with `/` (except `./`). */
function normalizeBase(raw: string) {
  if (raw === '/' || raw === '') {
    return '/';
  }
  return raw.endsWith('/') ? raw : `${raw}/`;
}

// CI sets VITE_SITE_BASE to /{repository}/ so it matches github.io/{repository}/.
const base = normalizeBase(process.env.VITE_SITE_BASE ?? '/');

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base,
});
