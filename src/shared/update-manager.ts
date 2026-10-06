interface UpdateManagerLike {
  onUpdateReady(callback: () => void): void
  onUpdateFailed(callback: () => void): void
  applyUpdate(): void
}

type ConfirmRestart = () => Promise<boolean>

const defaultConfirmRestart: ConfirmRestart = async () => {
  const result = await wx.showModal({
    title: '新版本已准备好',
    content: '重启小程序后即可使用新版本。',
    confirmText: '立即重启',
    cancelText: '稍后',
  })
  return result.confirm
}

export const setupUpdateManager = (
  updateManager: UpdateManagerLike,
  confirmRestart: ConfirmRestart = defaultConfirmRestart,
): void => {
  updateManager.onUpdateReady(() => {
    void confirmRestart().then((confirmed) => {
      if (confirmed) updateManager.applyUpdate()
    }).catch(() => {
      // 用户仍可在下次启动时获取新版本。
    })
  })

  updateManager.onUpdateFailed(() => {
    wx.showToast({ title: '新版本下载失败，请稍后重试', icon: 'none' })
  })
}
