import { action, observable } from 'mobx-miniprogram'
import { STORE_KEY } from '../../constants/index'
import { createPersistedStore } from '../../utils/persisted-store'

const persistence = createPersistedStore(
    STORE_KEY.AUTH,
    { username: '', password: '' },
    ['username', 'password']
)
const persisted = persistence.state

export const authStore = observable({
    username: persisted.username || '',
    password: persisted.password || '',

    get hasSession() {
        return Boolean(this.username && this.password)
    },

    persist: action(function () {
        persistence.persist(this)
    }),

    setCredentials: action(function (username, password) {
        this.username = username
        this.password = password
        this.persist()
    }),

    clear: action(function () {
        this.username = ''
        this.password = ''
        persistence.clear()
    }),
})
