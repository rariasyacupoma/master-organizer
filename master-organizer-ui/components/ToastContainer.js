import { ref } from 'vue'

let _counter = 0

export const toastBus = {
  _listeners: [],
  show(ticketId, msg) {
    this._listeners.forEach(fn => fn(ticketId, msg))
  },
  on(fn) { this._listeners.push(fn) },
  off(fn) { this._listeners = this._listeners.filter(l => l !== fn) },
}

export default {
  name: 'ToastContainer',
  setup() {
    const toasts = ref([])

    function show(ticketId, msg) {
      const id = ++_counter
      toasts.value.push({ id, ticketId, msg })
      setTimeout(() => dismiss(id), 15000)
    }

    function dismiss(id) {
      const idx = toasts.value.findIndex(t => t.id === id)
      if (idx !== -1) toasts.value.splice(idx, 1)
    }

    toastBus.on(show)

    return { toasts, dismiss }
  },
  template: `
    <div id="toast-container">
      <div v-for="t in toasts" :key="t.id" class="toast">
        <span class="toast-icon">✓</span>
        <div class="toast-body">
          <span class="toast-title">{{ t.ticketId }} finished</span>
          <span class="toast-msg">{{ t.msg }}</span>
        </div>
        <button class="toast-close" @click="dismiss(t.id)">✕</button>
      </div>
    </div>
  `,
}
