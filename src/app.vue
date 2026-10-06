<script setup lang="ts">
import { onLaunch } from 'wevu'
import { createStore } from 'wevu/store'
import { initErrorLogger } from './shared/error-logger'
import { setupUpdateManager } from './shared/update-manager'

defineAppJson({
  pages: [
    'pages/kb/kb',
    'pages/report/report',
    'pages/subCalendar/subCalendar',
  ],
  usingComponents: {},
  window: {
    navigationBarTextStyle: '@text-color-primary',
    navigationBarTitleText: '小江课表',
    navigationBarBackgroundColor: '@bg-color-container',
    backgroundColor: '@bg-color-container',
  },
  darkmode: true,
  themeLocation: 'theme.json',
  componentFramework: 'glass-easel',
  sitemapLocation: 'sitemap.json',
  lazyCodeLoading: 'requiredComponents',
})

createStore()

onLaunch(() => {
  initErrorLogger()
  setupUpdateManager(wx.getUpdateManager())
})
</script>
