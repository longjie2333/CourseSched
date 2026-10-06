import { computed, ref } from 'wevu'
import { defineStore } from 'wevu/store'
import type { RequestScope } from '../../shared/request-scope'
import { accountCoordinator } from '../../shared/dependencies'
import type { AccountView } from './account-coordinator'

export const useAccountStore = defineStore('account', () => {
  const username = ref('')
  const accountKey = ref<string>()
  const initialized = ref(false)
  const isAuthenticated = computed(() => Boolean(accountKey.value))

  const applyView = (view: AccountView): AccountView => {
    username.value = view.username
    accountKey.value = view.accountKey
    initialized.value = true
    return view
  }

  const initialize = (): AccountView => applyView(
    initialized.value ? accountCoordinator.getView() : accountCoordinator.initialize(),
  )

  const bind = async (
    nextUsername: string,
    password: string,
    scope?: RequestScope,
  ): Promise<AccountView> => applyView(
    await accountCoordinator.bind(nextUsername, password, scope),
  )

  const clear = (): void => {
    accountCoordinator.clear()
    applyView(accountCoordinator.getView())
  }

  return {
    username,
    accountKey,
    initialized,
    isAuthenticated,
    initialize,
    bind,
    clear,
  }
})
