import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
    plugins: [react()],
    server: {
        host: true,
        port: 5173,
        proxy: {
            '/api': {
                target: 'http://api-dev:8000', // ← localhost 금지, 컨테이너 DNS 사용
                changeOrigin: true,
                // 백엔드가 /api 프리픽스를 실제 라우트로 쓰지 않는다면 주석 해제
                // rewrite: (p) => p.replace(/^\/api/, ''),
            },
        },
        // HMR 이슈가 있으면 아래 주석을 해제
        // hmr: { host: 'localhost', port: 5173 },
        // strictPort: true,
    },
})
