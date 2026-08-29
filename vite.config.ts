import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('maplibre-gl') || id.includes('leaflet') || id.includes('react-leaflet')) {
              return 'vendor-maps';
            }
            if (id.includes('jspdf') || id.includes('jspdf-autotable') || id.includes('html2canvas')) {
              return 'vendor-export';
            }
            if (id.includes('recharts') || id.includes('d3')) {
              return 'vendor-charts';
            }
            return 'vendor';
          }
        },
      },
    },
  },
  server: {
    port: 3000,
    host: '0.0.0.0',
  },
});

