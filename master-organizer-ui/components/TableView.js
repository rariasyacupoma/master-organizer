import { store } from './store.js'

const EPIC_ICON = `<svg width="26" height="26" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" style="display:inline-block;vertical-align:middle;flex-shrink:0"><rect width="16" height="16" rx="3" fill="#7c3aed"/><path d="M9.5 2.5 L5 8.5 H8.5 L6.5 13.5 L12 7 H8.5 Z" fill="white"/></svg>`

const STATUS_LABEL = { in_progress: 'In Progress', blocked: 'Blocked', waiting: 'Waiting' }
const STATUS_EMOJI = { in_progress: '🔄', blocked: '🚫', waiting: '⏳' }

export default {
  name: 'TableView',
  setup() {
    function groups() {
      const { tickets, epics } = store
      const result = []
      const seen = new Set()
      for (const epic of epics) {
        const group = tickets.filter(t => t.epic === epic.id)
        if (group.length) { result.push({ epic, tickets: group }); seen.add(epic.id) }
      }
      const unknownEpics = [...new Set(tickets.filter(t => t.epic && !seen.has(t.epic)).map(t => t.epic))]
      for (const epicId of unknownEpics) {
        result.push({ epic: { id: epicId, title: epicId, url: null }, tickets: tickets.filter(t => t.epic === epicId) })
      }
      const noEpic = tickets.filter(t => !t.epic)
      if (noEpic.length) result.push({ epic: null, tickets: noEpic })
      return result
    }
    return { groups, store, STATUS_LABEL, STATUS_EMOJI, EPIC_ICON }
  },
  methods: {
    badge(status) {
      if (status === 'in_progress') return ''
      const emoji = STATUS_EMOJI[status] || ''
      const label = STATUS_LABEL[status] || status
      return `<span class="badge ${status}">${emoji} ${label}</span>`
    },
  },
  template: `
    <div>
      <div v-for="({ epic, tickets: group }) in groups()" :key="epic ? epic.id : '__none__'"
           class="epic-group" :class="{ 'epic-group-none': !epic }" style="margin-bottom:24px">
        <div class="epic-group-header" @click="$event.currentTarget.closest('.epic-group').classList.toggle('collapsed')">
          <span v-html="EPIC_ICON"></span>
          <a v-if="epic && epic.url" :href="epic.url" target="_blank" @click.stop
             style="color:#818cf8;text-decoration:none;font-weight:700;font-size:0.9rem;letter-spacing:.06em;text-transform:uppercase">{{ epic.title }}</a>
          <span v-else-if="epic" style="color:#818cf8;font-weight:700;font-size:0.9rem;text-transform:uppercase">{{ epic.title }}</span>
          <span v-else style="color:var(--muted);font-size:0.9rem;text-transform:uppercase">No epic</span>
          <span class="epic-group-count">{{ group.length }}</span>
          <span class="epic-group-chevron">▼</span>
        </div>
        <div class="epic-group-body">
          <table>
            <thead>
              <tr><th>Ticket</th><th>Title</th><th>Status</th><th>Services</th><th>Stage</th><th>Next Action</th><th>PRs</th></tr>
            </thead>
            <tbody>
              <tr v-for="t in group" :key="t.id">
                <td class="td-id"><a class="card-id" :href="t.url" target="_blank">{{ t.id }}</a></td>
                <td class="td-title">{{ t.title }}</td>
                <td><span v-if="t.status !== 'in_progress'" class="badge" :class="t.status">{{ STATUS_EMOJI[t.status] }} {{ STATUS_LABEL[t.status] }}</span></td>
                <td class="td-services">
                  <span v-for="s in t.services" :key="s" class="service-tag" style="display:block;margin-bottom:2px">{{ s }}</span>
                </td>
                <td style="color:var(--muted);text-align:center">{{ t.currentStage }}</td>
                <td class="td-next">{{ t.nextAction }}</td>
                <td class="td-prs">
                  <div class="prs-list">
                    <div v-for="pr in (t.prs || [])" :key="pr.number" class="pr-row">
                      <span class="pr-repo">{{ pr.repo }}</span>
                      <a class="pr-link" :class="pr.state === 'merged' ? 'merged' : ''" :href="pr.url" target="_blank">#{{ pr.number }}</a>
                    </div>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `,
}
