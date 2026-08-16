import { computed } from 'vue'
import { store } from './store.js'

const TERMINAL_SVG = `<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M1.5 3L4.5 6L1.5 9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M5.5 9H10.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`
const PLAN_SVG     = `<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><rect x="1.5" y="1.5" width="9" height="9" rx="1.5" stroke="currentColor" stroke-width="1.2"/><path d="M3.5 4h5M3.5 6h5M3.5 8h3" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>`
const DEPLOY_SVG   = `<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 1.5v7M6 1.5L3.5 4M6 1.5L8.5 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M2 10.5H10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`

export default {
  name: 'CardActions',
  props: { ticketId: String },
  emits: ['focus-tab', 'view-plan', 'switch-ticket'],
  setup(props) {
    const isWorking = computed(() => !!store.workingStatus[props.ticketId])
    const tilt = computed(() => {
      const { active, switchable } = store.tiltStatus
      const isSwitchable = switchable.some(t => t.id === props.ticketId)
      return { isActive: props.ticketId === active, isSwitchable }
    })
    return { isWorking, tilt, TERMINAL_SVG, PLAN_SVG, DEPLOY_SVG }
  },
  template: `
    <div class="card-actions">
      <button class="btn btn-terminal" :class="{ lit: isWorking }"
              @click="$emit('focus-tab', ticketId)"
              v-html="TERMINAL_SVG + ' Terminal'"></button>
      <button class="btn btn-plan"
              @click="$emit('view-plan', ticketId)"
              v-html="PLAN_SVG + ' Plan'"></button>
      <div class="btn-spacer"></div>
      <button class="btn btn-deploy"
              :class="{ active: tilt.isActive }"
              :disabled="!tilt.isSwitchable"
              :style="{ opacity: tilt.isSwitchable ? '' : '0.3', cursor: tilt.isSwitchable ? '' : 'default' }"
              @click="tilt.isSwitchable && $emit('switch-ticket', ticketId)"
              v-html="DEPLOY_SVG + (tilt.isActive ? ' Deployed' : ' Deploy')"></button>
    </div>
  `,
}
