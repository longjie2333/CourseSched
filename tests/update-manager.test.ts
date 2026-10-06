import { describe, expect, it, vi } from 'vitest'
import { setupUpdateManager } from '../src/shared/update-manager'

describe('update manager', () => {
  it('applies an update only after explicit confirmation', async () => {
    let ready: (() => void) | undefined
    const updateManager = {
      onUpdateReady: vi.fn((callback: () => void) => { ready = callback }),
      onUpdateFailed: vi.fn(),
      applyUpdate: vi.fn(),
    }
    const confirmRestart = vi.fn().mockResolvedValue(false)
    setupUpdateManager(updateManager, confirmRestart)

    ready?.()
    await Promise.resolve()
    expect(updateManager.applyUpdate).not.toHaveBeenCalled()

    confirmRestart.mockResolvedValue(true)
    ready?.()
    await Promise.resolve()
    expect(updateManager.applyUpdate).toHaveBeenCalledOnce()
  })
})
