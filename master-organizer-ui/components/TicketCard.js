import { computed, ref, watch, nextTick } from 'vue'
import { store } from './store.js'
import StatusBadge from './StatusBadge.js'
import WorkingIndicator from './WorkingIndicator.js'
import PrChip from './PrChip.js'
import StageChecklist from './StageChecklist.js'
import CardActions from './CardActions.js'

const EASE = 'cubic-bezier(.4,0,.2,1)'

export default {
  name: 'TicketCard',
  components: { StatusBadge, WorkingIndicator, PrChip, StageChecklist, CardActions },
  props: { ticket: Object },
  emits: ['focus-tab', 'view-plan', 'switch-ticket', 'toggle-checklist', 'focus-card'],
  setup(props) {
    const cardRef    = ref(null)
    const isFocused  = computed(() => store.focusedTicketId === props.ticket.id)
    const isTiltActive = computed(() => store.tiltStatus.active === props.ticket.id)

    const savedRect   = ref(null)
    const placeholder = ref(null)

    watch(isFocused, async (focused) => {
      const el = cardRef.value
      if (!el) return

      if (focused) {
        const rect = el.getBoundingClientRect()
        savedRect.value = { left: rect.left, top: rect.top, width: rect.width, height: rect.height }

        // Hold the grid space while card is floating
        const ph = document.createElement('div')
        ph.style.cssText = `width:${rect.width}px;height:${rect.height}px;visibility:hidden;pointer-events:none`
        el.parentNode.insertBefore(ph, el)
        placeholder.value = ph

        // Pin at current position first (no visual jump)
        el.style.cssText = `position:fixed;left:${rect.left}px;top:${rect.top}px;width:${rect.width}px;height:${rect.height}px;margin:0;z-index:51;transition:none`

        // Next frame: animate to center
        await nextTick()
        requestAnimationFrame(() => {
          el.style.cssText = `position:fixed;left:50%;top:50%;width:min(740px,92vw);max-height:88vh;overflow-y:auto;transform:translate(-50%,-50%);margin:0;z-index:51;transition:left .35s ${EASE},top .35s ${EASE},width .35s ${EASE},transform .35s ${EASE}`
        })
      } else {
        const rect = savedRect.value
        if (!rect || !el) return

        // Snap height back instantly, then animate position back
        el.style.cssText = `position:fixed;left:${rect.left}px;top:${rect.top}px;width:${rect.width}px;overflow-y:hidden;transform:none;margin:0;z-index:51;transition:left .3s ${EASE},top .3s ${EASE},width .3s ${EASE},transform .3s ${EASE}`

        el.addEventListener('transitionend', () => {
          el.style.cssText = ''
          placeholder.value?.remove()
          placeholder.value = null
          savedRect.value = null
        }, { once: true })
      }
    })

    // StageChecklist: overall progress
    const progress = computed(() => {
      if (!props.ticket.stages) return null
      const all  = props.ticket.stages.flatMap(s => s.checklist)
      const done = all.filter(i => i.done).length
      const pct  = all.length ? Math.round(done / all.length * 100) : 0
      const barCls = props.ticket.status === 'blocked' ? 'blocked'
                   : props.ticket.status === 'waiting' ? 'waiting' : 'normal'
      const currentIdx = props.ticket.stages.findIndex(
        s => s.status === 'in_progress' || s.status === 'blocked' || s.status === 'waiting'
      )
      return { done, total: all.length, pct, barCls, currentIdx }
    })

    return { cardRef, isFocused, isTiltActive, progress }
  },
  methods: {
    handleClick(e) {
      if (e.target.closest('a, button, input, label, .cl-stage-hdr')) return
      if (this.isFocused) return
      this.$emit('focus-card', this.ticket.id)
    },
    async toggleChecklist(stageIdx, itemIdx, done) {
      this.$emit('toggle-checklist', this.ticket.id, stageIdx, itemIdx, done)
    },
  },
  template: `
    <div ref="cardRef"
         class="card"
         :class="{ 'tilt-active': isTiltActive, focused: isFocused }"
         @click="handleClick">

      <!-- working badge: absolute top-right -->
      <working-indicator :ticket-id="ticket.id" />

      <!-- header: id + badge + title -->
      <div class="card-header">
        <div style="flex:1;display:flex;flex-direction:column;gap:6px">
          <div style="display:flex;align-items:center;gap:8px;justify-content:space-between">
            <a class="card-id" :href="ticket.url" target="_blank">{{ ticket.id }}</a>
            <status-badge :status="ticket.status" />
          </div>
          <div class="card-title">{{ ticket.title }}</div>
        </div>
      </div>

      <!-- services + stage label -->
      <div class="card-meta">
        <span v-for="s in ticket.services" :key="s" class="service-tag">{{ s }}</span>
        <span v-if="ticket.stages && progress" class="stage-label">
          Stage {{ progress.currentIdx >= 0 ? progress.currentIdx + 1 : ticket.stages.length }}
        </span>
        <span v-else-if="ticket.currentStage != null" class="stage-label">Stage {{ ticket.currentStage }}</span>
      </div>

      <!-- ── StageChecklist view ── -->
      <template v-if="ticket.stages">
        <div class="overall-progress">
          <div class="progress-label">
            <span>Progress</span>
            <span v-if="ticket.status === 'blocked'" class="blocker-pill blocked">🚫 Blocked</span>
            <span v-else-if="ticket.status === 'waiting'" class="blocker-pill waiting">⏳ Waiting</span>
            <span v-else>{{ progress.pct }}%</span>
          </div>
          <div class="progress-bar-track">
            <div class="progress-bar-fill" :class="progress.barCls" :style="{ width: progress.pct + '%' }"></div>
          </div>
        </div>
        <stage-checklist :stages="ticket.stages" :ticket-id="ticket.id" @toggle="toggleChecklist" />
      </template>

      <!-- ── Simple view ── -->
      <template v-else>
        <div v-if="ticket.latestUpdate" class="latest-update">
          <div class="latest-update-title">◎ Latest update</div>
          <p>{{ ticket.latestUpdate }}</p>
        </div>
        <div v-if="ticket.nextSteps && ticket.nextSteps.length" class="next-steps">
          <div class="next-steps-title">▶ Next steps</div>
          <ol><li v-for="(s, i) in ticket.nextSteps" :key="i">{{ s }}</li></ol>
        </div>
        <div v-if="ticket.prs && ticket.prs.length"
             class="prs-list" style="border-top:1px solid var(--border);padding-top:14px">
          <pr-chip v-for="pr in ticket.prs" :key="pr.number" :pr="pr" />
        </div>
      </template>

      <card-actions :ticket-id="ticket.id"
                    @focus-tab="id => $emit('focus-tab', id)"
                    @view-plan="id => $emit('view-plan', id)"
                    @switch-ticket="id => $emit('switch-ticket', id)" />
    </div>
  `,
}
