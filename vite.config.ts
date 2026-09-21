import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 4400
  },
  test: {
    // Alineado con eslint.config.js: .claude/ y output/releases/ alojan worktrees de otras
    // ramas y tmp/ borradores locales; sus tests no son evidencia de main.
    exclude: ['**/node_modules/**', '**/dist/**', '.claude/**', 'output/**', 'tmp/**']
  }
});
