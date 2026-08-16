import { computed } from 'vue'
import { store } from './store.js'

const TERMINAL_SVG = `<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M1.5 3L4.5 6L1.5 9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M5.5 9H10.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`
const PLAN_SVG     = `<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><rect x="1.5" y="1.5" width="9" height="9" rx="1.5" stroke="currentColor" stroke-width="1.2"/><path d="M3.5 4h5M3.5 6h5M3.5 8h3" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>`
const DEPLOY_SVG   = `<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M7 1.5L3.5 6.5H6.5L5 10.5L9 5H6L7 1.5Z" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round" fill="currentColor" fill-opacity="0.15"/></svg>`

export default {
  name: 'CardActions',
  props: { ticketId: String },
  emits: ['focus-tab', 'view-plan', 'switch-ticket'],
  setup(props) {
    const isWorking  = computed(() => !!store.workingStatus[props.ticketId])
    const isSwitching = computed(() => store.switchingTicketId === props.ticketId)
    const tilt = computed(() => {
      const { active, switchable } = store.tiltStatus
      const isSwitchable = switchable.some(t => t.id === props.ticketId)
      return { isActive: props.ticketId === active, isSwitchable }
    })
    return { isWorking, isSwitching, tilt, TERMINAL_SVG, PLAN_SVG, DEPLOY_SVG }
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
              :class="{ active: tilt.isActive, switching: isSwitching }"
              :disabled="!tilt.isSwitchable || isSwitching"
              :style="{ opacity: tilt.isSwitchable ? '' : '0.3', cursor: (tilt.isSwitchable && !isSwitching) ? '' : 'default' }"
              @click="tilt.isSwitchable && !isSwitching && $emit('switch-ticket', ticketId)">
        <span v-if="isSwitching" class="deploy-spinner"></span>
        <span v-else v-html="DEPLOY_SVG"></span>
        {{ isSwitching ? 'Deploying…' : tilt.isActive ? 'Deployed' : 'Deploy' }}
      </button>
    </div>
  `,
}
