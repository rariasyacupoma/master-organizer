import { ref } from 'vue'
import TicketCard from './TicketCard.js'

const EPIC_ICON = `<svg width="26" height="26" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" style="display:inline-block;vertical-align:middle;flex-shrink:0"><rect width="16" height="16" rx="3" fill="#7c3aed"/><path d="M9.5 2.5 L5 8.5 H8.5 L6.5 13.5 L12 7 H8.5 Z" fill="white"/></svg>`

export default {
  name: 'EpicGroup',
  components: { TicketCard },
  props: {
    epic: Object,   // null for "No epic" group
    tickets: Array,
  },
  emits: ['focus-tab', 'view-plan', 'switch-ticket', 'toggle-checklist', 'focus-card'],
  setup() {
    const collapsed = ref(false)
    return { collapsed, EPIC_ICON }
  },
  template: `
    <div class="epic-group" :class="{ collapsed, 'epic-group-none': !epic }">
      <div class="epic-group-header" @click="collapsed = !collapsed">
        <span v-html="EPIC_ICON"></span>
        <a v-if="epic && epic.url" :href="epic.url" target="_blank" @click.stop>{{ epic.title }}</a>
        <span v-else-if="epic" style="color:#818cf8;font-weight:700;font-size:0.9rem;letter-spacing:.06em;text-transform:uppercase">{{ epic.title }}</span>
        <span v-else style="color:var(--muted);font-size:0.9rem;text-transform:uppercase">No epic</span>
        <span class="epic-group-count">{{ tickets.length }}</span>
        <span class="epic-group-chevron">▼</span>
      </div>
      <div class="epic-group-body">
        <div class="grid">
          <ticket-card
            v-for="t in tickets" :key="t.id"
            :ticket="t"
            @focus-tab="id => $emit('focus-tab', id)"
            @view-plan="id => $emit('view-plan', id)"
            @switch-ticket="id => $emit('switch-ticket', id)"
            @toggle-checklist="(...a) => $emit('toggle-checklist', ...a)"
            @focus-card="id => $emit('focus-card', id)"
          />
        </div>
      </div>
    </div>
  `,
}
