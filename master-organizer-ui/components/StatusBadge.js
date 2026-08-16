const STATUS_LABEL = { in_progress: 'In Progress', blocked: 'Blocked', waiting: 'Waiting' }
const STATUS_EMOJI = { blocked: '🚫', waiting: '⏳' }

export default {
  name: 'StatusBadge',
  props: { status: String },
  setup(props) {
    return { STATUS_LABEL, STATUS_EMOJI }
  },
  template: `
    <span v-if="status !== 'in_progress'" class="badge" :class="status">
      {{ STATUS_EMOJI[status] }} {{ STATUS_LABEL[status] }}
    </span>
  `,
}
