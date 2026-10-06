import { defineConfig } from 'weapp-vite/config'
import { TDesignResolver } from 'weapp-vite/auto-import-components/resolvers'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  resolve: {
    alias: {
      '/miniprogram_npm/tdesign-miniprogram': fileURLToPath(
        new URL('./node_modules/tdesign-miniprogram/miniprogram_dist', import.meta.url),
      ),
    },
  },
  weapp: {
    platform: 'weapp',
    srcRoot: 'src',
    autoRoutes: false,
    uniApp: false,
    typescript: {
      app: {
        compilerOptions: {
          erasableSyntaxOnly: false,
          paths: {
            'tdesign-miniprogram/*': ['./node_modules/tdesign-miniprogram/miniprogram_dist/*'],
          },
        },
      },
    },
    autoImportComponents: {
      resolvers: [
        TDesignResolver({
          resolve: ({ name, prefix }) => ({
            key: `${prefix}${name}`,
            value: `/miniprogram_npm/tdesign-miniprogram/${name}/${name}`,
          }),
        }),
      ],
    },
    generate: {
      extensions: {
        js: 'ts',
        wxss: 'wxss',
      },
      dirs: {
        component: 'src/shared',
        page: 'src/pages',
      },
    },
  },
})
