import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  server: {
    port: 3000,
    host: '0.0.0.0',
    // إعداد الوكيل لتوجيه طلبات API إلى الخادم الخلفي
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
        secure: false,
      }
    }
  },
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    }
  },
  // تأكيد عدم تسريب متغيرات البيئة الحساسة
  define: {
    'process.env.GEMINI_API_KEY': JSON.stringify(undefined) 
  }
});