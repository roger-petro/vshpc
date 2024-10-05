import { defineConfig, loadEnv } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

// // https://vitejs.dev/config/
// export default defineConfig({
//   plugins: [svelte()],
// })


/**
 * generalAssets é um middleware feito
 * por uma dica, veja o general_assets
 */
// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    server: {
      hmr: {
        overlay: false
      },
      proxy: {
        /** o proxy é usado para testar a interface do webview diretamente pelo browser.
         * sem precisar usar debugar a extensão.
         * altere a URL para apontar para o seu servidor elastic search (onde estão os
         * registros do SLURM)
         * Na condição de produção o proxy é gerado pelo panel correspondente da extensão
         * com a url/porta do proxy injetada via cabeção html do webview.
         * */

        "/api": {
          target: env.VITE_PROXY_TARGET || 'http://localhost:9200/',
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/api/, ""),
        },
      },
    },
    plugins: [
      svelte()
    ],
    build: {
      minify: false,
      outDir: '../media',

      rollupOptions: {

        output: {
          entryFileNames: '[name].js',
          assetFileNames: 'assets/[name][extname]',
        },

      }
    }
  };
});