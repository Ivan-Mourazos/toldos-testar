import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 4400
  },
  build: {
    rollupOptions: {
      // Dos páginas: la aplicación y la hoja de taller de remolques (fase 4), que Chromium abre
      // en el servidor para hacer el PDF. `index` mantiene el nombre del bundle principal.
      input: {
        index: fileURLToPath(new URL('./index.html', import.meta.url)),
        hoja: fileURLToPath(new URL('./hoja-remolques.html', import.meta.url))
      }
    }
  },
  test: {
    // Alineado con eslint.config.js: .claude/ y output/releases/ alojan worktrees de otras
    // ramas y tmp/ borradores locales; sus tests no son evidencia de main.
    exclude: ['**/node_modules/**', '**/dist/**', '.claude/**', 'output/**', 'tmp/**']
  }
});
