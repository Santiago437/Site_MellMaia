import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({ plugins:[react()], build:{sourcemap:false,rollupOptions:{output:{manualChunks(id){if(id.includes('node_modules/@supabase/')||id.includes('node_modules/iceberg-js/'))return 'supabase';if(id.includes('node_modules/react/')||id.includes('node_modules/react-dom/')||id.includes('node_modules/scheduler/'))return 'react-vendor';}}}}, server:{port:5173,strictPort:true} });
