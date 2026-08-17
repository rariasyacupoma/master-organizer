import { computed, ref, onMounted, onUnmounted } from 'vue'
import { store } from './store.js'

function elapsed(since) {
  if (!since || since === true) return ''
  const ms = Date.now() - new Date(since).getTime()
  if (ms < 0) return ''
  const m = Math.floor(ms / 60000)
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60), rm = m % 60
  return rm > 0 ? `${h}h ${rm}m` : `${h}h`
}

export default {
  name: 'WorkingIndicator',
  props: { ticketId: String },
  setup(props) {
    const tick = ref(0)
    let timer = null

    onMounted(() => { timer = setInterval(() => { tick.value++ }, 60000) })
    onUnmounted(() => { clearInterval(timer) })

    const since    = computed(() => store.workingStatus[props.ticketId])
    const isWorking = computed(() => !!since.value)
    const duration  = computed(() => { void tick.value; return elapsed(since.value) })

    return { isWorking, duration }
  },
  template: `
    <div v-if="isWorking" class="working-badge">
      <div class="working-dot"></div>
      <span class="working-label">WORKING</span>
      <span v-if="duration" class="working-sep">·</span>
      <span v-if="duration" class="working-dur">{{ duration }}</span>
    </div>
  `,
}
