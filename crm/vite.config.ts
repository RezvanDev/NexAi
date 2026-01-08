import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
    plugins: [react()],
    root: path.resolve(import.meta.dirname, "client"),
    server: {
        port: 3002,
        proxy: {
            '/api': 'http://localhost:3001'
        }
    },
    resolve: {
        alias: {
            "@": path.resolve(import.meta.dirname, "../client/src"),
            "@crm": path.resolve(import.meta.dirname, "client/src"),
            "@shared": path.resolve(import.meta.dirname, "../shared"),
        }
    }
});
