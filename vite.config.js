import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  // 配置代理和服务器
  server: {
    host: '0.0.0.0', // 允许外部设备访问
    port: 5173, // 自定义端口
    proxy: {
      '/api': {
        target: 'http://localhost:1234', // 后端服务器地址
        changeOrigin: true, // 是否改变请求域名
        rewrite: (path) => path.replace(/^\/api/, '') // 将原有请求路径中的api替换为''
      }
    }
  }
})