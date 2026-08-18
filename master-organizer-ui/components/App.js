import { ref, computed, onMounted, onUnmounted } from 'vue'
import { store } from './store.js'
import { toastBus } from './ToastContainer.js'
import Sidebar from './Sidebar.js'
import EpicGroup from './EpicGroup.js'
import TableView from './TableView.js'
import DeploymentsOverlay from './DeploymentsOverlay.js'
import PlanOverlay from './PlanOverlay.js'
import ToastContainer from './ToastContainer.js'

const STATUS_LABEL = { in_progress: 'In Progress', blocked: 'Blocked', waiting: 'Waiting' }

export default {
  name: 'App',
  components: { Sidebar, EpicGroup, TableView, DeploymentsOverlay, PlanOverlay, ToastContainer },
  setup() {
    const view              = ref('grid')
    const deploymentsOpen   = ref(false)
    const planTicketId      = ref(null)
    const planOpen          = ref(false)
    const sessions          = ref([])
    const syncState         = ref('')     // '' | 'syncing' | 'success' | 'error'
    let _es                 = null
    let _workingPoll        = null
    let _tiltPoll           = null
    let _prevWorkingStatus  = {}

    // ── Stats ──
    const stats = computed(() => {
      const counts = store.tickets.reduce((a, t) => { a[t.status] = (a[t.status] || 0) + 1; return a }, {})
      return Object.entries(counts).map(([s, n]) => ({ status: s, count: n, label: STATUS_LABEL[s] || s }))
    })

    // ── Epic groups ──
    const epicGroups = computed(() => {
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
    })

    // ── Data loading ──
    async function loadAll() {
      try {
        const [moRes, depRes, verRes, epicRes] = await Promise.all([
          fetch('/master-organizer.json'),
          fetch('/deployments'),
          fetch('/versioning'),
          fetch('/epics'),
        ])
        const { tickets }  = await moRes.json()
        store.tickets      = tickets
        store.deployments  = await depRes.json()
        store.versioning   = await verRes.json()
        store.epics        = await epicRes.json()
      } catch (e) { console.error('loadAll:', e) }
    }

    async function loadSessions() {
      try {
        const res = await fetch('/persistent-sessions')
        sessions.value = await res.json()
      } catch {}
    }

    // ── Working status ──
    async function pollWorking() {
      try {
        const res  = await fetch('/working-status')
        const fresh = await res.json()
        for (const id of Object.keys(_prevWorkingStatus)) {
          if (_prevWorkingStatus[id] && !fresh[id]) notify(id)
        }
        _prevWorkingStatus = fresh
        store.workingStatus = fresh
      } catch {}
    }

    function notify(ticketId) {
      const t = store.tickets.find(t => t.id === ticketId)
      const msg = t ? t.title : 'Claude session finished.'
      toastBus.show(ticketId, msg)
      fetch('/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: `${ticketId} finished`, message: msg }),
      }).catch(() => {})
    }

    // ── Tilt ──
    async function loadTilt() {
      try {
        const res = await fetch('/tilt-status')
        store.tiltStatus = await res.json()
        if (store.tiltStatus.switching) {
          clearTimeout(_tiltPoll)
          _tiltPoll = setTimeout(loadTilt, 2000)
        } else {
          store.switchingTicketId = null
        }
      } catch {}
    }

    async function switchTicket(ticketId) {
      store.switchingTicketId = ticketId
      try {
        const res  = await fetch('/switch-ticket', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ticketId }),
        })
        const data = await res.json()
        if (data.ok) { clearTimeout(_tiltPoll); _tiltPoll = setTimeout(loadTilt, 1500) }
        else { store.switchingTicketId = null; console.error('switch-ticket failed:', data.output) }
      } catch (e) { store.switchingTicketId = null; console.error('switch-ticket error:', e) }
    }

    async function toggleWatcher() {
      const cmd = store.tiltStatus.watcherRunning ? 'stop' : 'start'
      try {
        await fetch('/watcher', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cmd }),
        })
      } catch {}
      await loadTilt()
    }

    // ── Focus tab / session ──
    async function focusTab(ticketId) {
      store.focusingTabTicketId = ticketId
      try {
        await fetch('/focus-tab', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ticketId }),
        })
      } catch {}
      finally { store.focusingTabTicketId = null }
    }

    // ── Sync PRs ──
    async function syncPRs() {
      if (syncState.value === 'syncing') return
      syncState.value = 'syncing'
      try {
        const res  = await fetch('/sync-prs', { method: 'POST' })
        const data = await res.json()
        syncState.value = data.ok ? 'success' : 'error'
        if (data.ok) await loadAll()
      } catch { syncState.value = 'error' }
      setTimeout(() => { syncState.value = '' }, 3000)
    }

    // ── Plan overlay ──
    function viewPlan(ticketId) {
      planTicketId.value = ticketId
      planOpen.value = true
      history.pushState({ plan: ticketId }, '', `#plan-${ticketId}`)
      document.body.style.overflow = 'hidden'
    }

    function closePlan() {
      planOpen.value = false
      planTicketId.value = null
      document.body.style.overflow = ''
      if (location.hash.startsWith('#plan-')) history.pushState({}, '', '/')
    }

    // ── Deployments overlay ──
    function openDeployments() {
      deploymentsOpen.value = true
      history.pushState({ deployments: true }, '', '#deployments')
      document.body.style.overflow = 'hidden'
    }

    function closeDeployments() {
      deploymentsOpen.value = false
      document.body.style.overflow = ''
      if (location.hash === '#deployments') history.pushState({}, '', '/')
    }

    // ── Focus card mode ──
    function focusCard(ticketId) {
      store.focusedTicketId = ticketId
    }

    function unfocusCard() {
      store.focusedTicketId = null
    }

    // ── Checklist toggle ──
    async function toggleChecklist(ticketId, stageIdx, itemIdx, done) {
      try {
        const res  = await fetch('/toggle-checklist-item', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ticketId, stageIdx, itemIdx, done }),
        })
        const data = await res.json()
        if (!data.ok) console.error('toggle-checklist failed:', data.error)
        else {
          const ticket = store.tickets.find(t => t.id === ticketId)
          const stage  = ticket?.stages?.[stageIdx]
          if (stage?.checklist?.[itemIdx] != null) {
            stage.checklist[itemIdx].done = done
            // Mirror server: auto-complete or revert stage status
            if (stage.checklist.every(i => i.done)) {
              if (stage.status !== 'done') stage.status = 'done'
            } else if (stage.status === 'done') {
              stage.status = 'in_progress'
            }
          }
        }
      } catch (e) { console.error('toggle-checklist error:', e) }
    }

    // ── Keyboard / popstate ──
    function onKeydown(e) {
      if (e.key !== 'Escape') return
      if (planOpen.value)        { history.back(); return }
      if (deploymentsOpen.value) { history.back(); return }
      unfocusCard()
    }

    function onPopstate() {
      if (planOpen.value)        { planOpen.value = false; document.body.style.overflow = '' }
      if (deploymentsOpen.value) { deploymentsOpen.value = false; document.body.style.overflow = '' }
    }

    // ── Lifecycle ──
    onMounted(async () => {
      if (Notification.permission === 'default') Notification.requestPermission()
      await Promise.all([loadAll(), loadSessions(), pollWorking(), loadTilt()])
      _workingPoll = setInterval(pollWorking, 20000)

      _es = new EventSource('/events')
      _es.onmessage = () => loadAll()

      window.addEventListener('keydown', onKeydown)
      window.addEventListener('popstate', onPopstate)
    })

    onUnmounted(() => {
      _es?.close()
      clearInterval(_workingPoll)
      clearTimeout(_tiltPoll)
      window.removeEventListener('keydown', onKeydown)
      window.removeEventListener('popstate', onPopstate)
    })

    return {
      view, epicGroups, stats, sessions, syncState,
      deploymentsOpen, planOpen, planTicketId,
      openDeployments, closeDeployments,
      viewPlan, closePlan,
      focusCard, unfocusCard,
      toggleChecklist, focusTab,
      switchTicket, toggleWatcher, syncPRs,
      store, STATUS_LABEL,
    }
  },
  template: `
    <div>
      <!-- Header -->
      <header>
        <h1><img src="logo-holo-b.svg" alt="" />MASTER ORGANIZER</h1>
        <div class="stats">
          <span v-for="s in stats" :key="s.status">
            <span class="dot" :style="{ background: 'var(--status-' + s.status + ')' }"></span>
            {{ s.count }} {{ s.label }}
          </span>
        </div>
        <div style="display:flex;align-items:center;gap:12px">
          <button id="sync-btn" :class="syncState" @click="syncPRs">
            <span v-if="syncState === 'syncing'" class="spin">⟳</span>
            <span v-else>⟳</span>
            {{ syncState === 'syncing' ? 'Syncing…' : syncState === 'success' ? 'Synced ✓' : syncState === 'error' ? 'Failed ✕' : 'Sync PRs' }}
          </button>
          <button id="deploy-view-btn" @click="openDeployments">⬡ Deployments</button>
          <div class="view-toggle">
            <button @click="view = 'grid'" :class="{ active: view === 'grid' }">Grid</button>
            <button @click="view = 'table'" :class="{ active: view === 'table' }">Table</button>
          </div>
        </div>
      </header>

      <!-- Body -->
      <div class="app-body">
        <sidebar
          :sessions="sessions"
          @focus-session="focusTab"
          @switch-ticket="switchTicket"
          @toggle-watcher="toggleWatcher"
        />
        <main style="padding:24px;flex:1;min-width:0">
          <!-- Grid view -->
          <div id="view-grid" :class="{ active: view === 'grid' }">
            <epic-group
              v-for="g in epicGroups" :key="g.epic ? g.epic.id : '__none__'"
              :epic="g.epic"
              :tickets="g.tickets"
              @focus-tab="focusTab"
              @view-plan="viewPlan"
              @switch-ticket="switchTicket"
              @toggle-checklist="toggleChecklist"
              @focus-card="focusCard"
            />
          </div>
          <!-- Table view -->
          <div id="view-table" :class="{ active: view === 'table' }">
            <table-view v-if="view === 'table'" />
          </div>
        </main>
      </div>

      <!-- Focus backdrop -->
      <div id="focus-backdrop" :class="{ visible: store.focusedTicketId }" @click="unfocusCard"></div>

      <!-- Overlays -->
      <deployments-overlay :visible="deploymentsOpen" @close="closeDeployments" />
      <plan-overlay :visible="planOpen" :ticket-id="planTicketId" @close="closePlan" />

      <!-- Toasts -->
      <toast-container />
    </div>
  `,
}
