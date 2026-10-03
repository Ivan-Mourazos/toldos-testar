import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 4400,
    // Las instancias aisladas y las capturas escriben en estas carpetas; vigilarlas rompe Vite con EBUSY en Windows.
    watch: { ignored: ['**/tmp/**', '**/output/**', '**/.claude/**'] }
  },
  build: {
    rollupOptions: {
      // Tres páginas: la aplicación, la hoja de taller de remolques (fase 4) y la página de telas
      // de toldos, que Chromium abre en el servidor para hacer el PDF. `index` mantiene el nombre
      // del bundle principal.
      input: {
        index: fileURLToPath(new URL('./index.html', import.meta.url)),
        hoja: fileURLToPath(new URL('./hoja-remolques.html', import.meta.url)),
        telas: fileURLToPath(new URL('./hoja-telas.html', import.meta.url))
      }
    }
  },
  test: {
    // Alineado con eslint.config.js: .claude/ y output/releases/ alojan worktrees de otras
    // ramas y tmp/ borradores locales; sus tests no son evidencia de main.
    exclude: ['**/node_modules/**', '**/dist/**', '.claude/**', 'output/**', 'tmp/**']
  }
});
