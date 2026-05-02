import { initErrorLogger } from './utils/error-logger'

App({
  onLaunch() {
    initErrorLogger()

    const updateManager = wx.getUpdateManager()
    updateManager.onCheckForUpdate(function (res) {})
    updateManager.onUpdateReady(function () {
      updateManager.applyUpdate()
    })
  }
})
