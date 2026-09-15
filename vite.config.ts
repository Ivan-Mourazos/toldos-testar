import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 4400
  },
  test: {
    // Los worktrees de .claude/ son otras ramas: sus tests no son evidencia de main.
    exclude: ['**/node_modules/**', '**/dist/**', '.claude/**']
  }
});
