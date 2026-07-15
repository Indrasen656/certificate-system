import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
// client/vite.config.js
export default defineConfig({
    plugins: [react()],
    server: {
        port: 3000,
        host: true, // Exposes Vite dev server to the local network
        proxy: {
            '/api': {
                target: 'http://127.0.0.1:5000', // Change this line from localhost to 127.0.0.1
                changeOrigin: true,
            },
        },
    },
});