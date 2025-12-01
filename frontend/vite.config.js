import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
    const apiBase = process.env.VITE_API_BASE_URL || 'http://localhost:8000'
    return {
        plugins: [react()],
        server: {
            host: true,
            port: 5173,
            proxy: {
                '/api': {
                    target: apiBase,
                    changeOrigin: true,
                    // rewrite: (p) => p.replace(/^\/api/, ''),
                },
                '/static': {
                    target: 'http://localhost:8000',
                    changeOrigin: true,
      },
            },
        },
    }
})
