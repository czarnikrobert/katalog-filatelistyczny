import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Ścieżki względne + HashRouter: działa na GitHub Pages pod dowolną nazwą repozytorium.
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  build: {
    rolldownOptions: {
      output: {
        // Biblioteki w osobnych plikach — zmieniają się rzadko, więc przeglądarka trzyma je w pamięci podręcznej.
        codeSplitting: {
          groups: [
            { name: 'supabase', test: /node_modules[\\/]@supabase/ },
            { name: 'react', test: /node_modules[\\/](react|react-dom|react-router|scheduler)[\\/]/ },
          ],
        },
      },
    },
  },
})
