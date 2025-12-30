import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  // Base path for GitHub Pages when the site is served at
  // https://<USERNAME>.github.io/<REPO>/ — set to '/<REPO>/'
  base: '/worldcup/',
  plugins: [tailwindcss(), react()],
})
