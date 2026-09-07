import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// "base" doit correspondre au nom de ton repo GitHub si tu déploies sur
// https://ton-pseudo.github.io/nom-du-repo/. Si tu utilises un domaine
// personnalisé (andiamo-ldc.com) en racine, remets base: '/'.
export default defineConfig({
  plugins: [react()],
  base: '/',
});
