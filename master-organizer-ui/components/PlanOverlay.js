import { ref } from 'vue'

export default {
  name: 'PlanOverlay',
  props: { visible: Boolean, ticketId: String },
  emits: ['close'],
  setup() {
    const content = ref('')
    const loading = ref(false)
    return { content, loading }
  },
  watch: {
    async ticketId(id) {
      if (!id) { this.content = ''; return }
      this.loading = true
      try {
        const res  = await fetch(`/implementation-plan/${id}`)
        const data = await res.json()
        this.content = data.ok ? window.marked.parse(data.content) : ''
      } finally { this.loading = false }
    },
  },
  template: `
    <div id="plan-overlay" :class="{ visible }">
      <div id="plan-header">
        <button id="plan-back" @click="$emit('close')">← Back</button>
        <span id="plan-ticket-id">{{ ticketId }}</span>
      </div>
      <div id="plan-body">
        <div v-if="loading" style="color:var(--muted);font-size:0.75rem;padding:20px">Loading…</div>
        <div v-else v-html="content"></div>
      </div>
    </div>
  `,
}
