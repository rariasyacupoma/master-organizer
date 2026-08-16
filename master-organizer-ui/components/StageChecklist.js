import { ref, computed, watch } from 'vue'
import PrChip from './PrChip.js'

function nodeClass(status) {
  if (status === 'done')        return 'done'
  if (status === 'in_progress') return 'current'
  if (status === 'blocked')     return 'blocked'
  if (status === 'waiting')     return 'waiting'
  return 'future'
}

const StageRow = {
  name: 'StageRow',
  components: { PrChip },
  props: { stage: Object, stageIdx: Number, ticketId: String },
  emits: ['toggle'],
  setup(props) {
    const open = ref(['in_progress', 'blocked', 'waiting'].includes(props.stage.status))

    // Auto-collapse when status flips to done (e.g. after all checkboxes ticked)
    watch(() => props.stage.status, (newStatus) => {
      if (newStatus === 'done') open.value = false
    })

    const nc       = computed(() => nodeClass(props.stage.status))
    const doneCount = computed(() => props.stage.checklist.filter(i => i.done).length)
    const total     = computed(() => props.stage.checklist.length)
    const pct       = computed(() => total.value ? Math.round(doneCount.value / total.value * 100) : 0)
    const fracCls   = computed(() => props.stage.status === 'blocked' ? 'blocked' : props.stage.status === 'waiting' ? 'waiting' : '')
    return { open, nc, doneCount, total, pct, fracCls }
  },
  methods: {
    itemClass(item) {
      if (item.done) return 'done'
      if (this.nc === 'current') return 'current'
      if (this.nc === 'blocked') return 'blocked'
      if (this.nc === 'waiting') return 'waiting'
      return ''
    },
  },
  template: `
    <div class="cl-stage" :class="{ open }">
      <div class="cl-stage-hdr" @click="open = !open">
        <div class="cl-node" :class="nc"></div>
        <span class="cl-stage-name" :class="nc">{{ stage.name }}</span>
        <div class="cl-frac-bar">
          <span class="cl-frac" :class="fracCls">{{ doneCount }}/{{ total }}</span>
          <div class="cl-frac-track"><div class="cl-frac-fill" :class="nc" :style="{ width: pct + '%' }"></div></div>
        </div>
        <span class="cl-chevron">▼</span>
      </div>
      <div class="cl-body">
        <div v-if="stage.blockerNote" class="blocker-note" :class="stage.status" style="margin-bottom:6px">
          <span>{{ stage.status === 'blocked' ? '🚫' : '⏳' }}</span>
          <span>{{ stage.blockerNote }}</span>
        </div>
        <div v-if="stage.prs && stage.prs.length" class="cl-pr-row">
          <span class="cl-pr-label">PRs</span>
          <div class="pr-chips">
            <pr-chip v-for="pr in stage.prs" :key="pr.number" :pr="pr" />
          </div>
        </div>
        <label v-for="(item, idx) in stage.checklist" :key="idx"
               class="cl-item" :class="itemClass(item)">
          <input type="checkbox" :checked="item.done"
                 @change="$emit('toggle', stageIdx, idx, $event.target.checked)" />
          {{ item.label }}
        </label>
      </div>
    </div>
  `,
}

export default {
  name: 'StageChecklist',
  components: { StageRow },
  props: { stages: Array, ticketId: String },
  emits: ['toggle'],
  template: `
    <div class="cl">
      <stage-row v-for="(stage, i) in stages" :key="i"
                 :stage="stage" :stage-idx="i" :ticket-id="ticketId"
                 @toggle="(si, ii, done) => $emit('toggle', si, ii, done)" />
    </div>
  `,
}
