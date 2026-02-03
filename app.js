App({
  onLaunch() {
    const updateManager = wx.getUpdateManager()
    updateManager.onCheckForUpdate(function (res) {})
    updateManager.onUpdateReady(function () {
      updateManager.applyUpdate()
    })
  }
})
