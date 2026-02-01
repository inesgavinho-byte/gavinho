import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    // Increase chunk size warning limit (default is 500kb)
    chunkSizeWarningLimit: 1000,

    rollupOptions: {
      output: {
        // Manual chunks for better caching and load time
        manualChunks: (id) => {
          // React core - rarely changes
          if (id.includes('node_modules/react') ||
              id.includes('node_modules/react-dom') ||
              id.includes('node_modules/react-router')) {
            return 'vendor-react'
          }

          // Supabase - separate chunk
          if (id.includes('node_modules/@supabase')) {
            return 'vendor-supabase'
          }

          // Heavy document libraries
          if (id.includes('node_modules/xlsx') ||
              id.includes('node_modules/docx') ||
              id.includes('node_modules/jspdf') ||
              id.includes('node_modules/html2canvas')) {
            return 'vendor-docs'
          }

          // PDF library
          if (id.includes('node_modules/react-pdf') ||
              id.includes('node_modules/pdfjs-dist')) {
            return 'vendor-pdf'
          }

          // Icons - relatively large
          if (id.includes('node_modules/lucide-react')) {
            return 'vendor-icons'
          }
        }
      }
    }
  },

  // Optimize deps for faster dev startup
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'lucide-react',
      '@supabase/supabase-js'
    ]
  }
})
