import { computed } from 'vue'
import { store } from './store.js'

export default {
  name: 'WorkingIndicator',
  props: { ticketId: String },
  setup(props) {
    const isWorking = computed(() => !!store.workingStatus[props.ticketId])
    const sinceTime = computed(() => {
      if (!isWorking.value) return ''
      const now = new Date()
      return `${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}`
    })
    return { isWorking, sinceTime }
  },
  template: `
    <div v-if="isWorking" class="working-row">
      <div class="working-dot"></div>
      <span>Active session open</span>
      <span class="working-since">since {{ sinceTime }}</span>
    </div>
  `,
}
