import { ref } from 'vue'
import { store } from './store.js'

const DB_ALIASES = [
  { alias: 'db-uds-local',        label: 'UDS local',         env: 'local' },
  { alias: 'db-uds-staging',      label: 'UDS staging',       env: 'staging' },
  { alias: 'db-uds-production',   label: 'UDS production',    env: 'production' },
  { alias: 'db-ss-local',         label: 'SS local',          env: 'local' },
  { alias: 'db-ss-staging',       label: 'SS staging',        env: 'staging' },
  { alias: 'db-license-local',    label: 'License local',     env: 'local' },
  { alias: 'db-license-staging',  label: 'License staging',   env: 'staging' },
  { alias: 'db-keycloak-local',   label: 'Keycloak local',    env: 'local' },
  { alias: 'db-keycloak-preprod', label: 'Keycloak preprod',  env: 'preprod' },
  { alias: 'db-platform-local',   label: 'Platform local',    env: 'local' },
  { alias: 'db-platform-preprod', label: 'Platform preprod',  env: 'preprod' },
  { alias: 'db-platform-qa',      label: 'Platform QA',       env: 'qa' },
]

const PF_ALIASES = [
  { alias: 'portforward-platform-preprod',      label: 'Platform preprod',   env: 'preprod' },
  { alias: 'portforward-iam-legacy-staging',    label: 'IAM legacy staging', env: 'staging' },
  { alias: 'portforward-iam-legacy-production', label: 'IAM legacy prod',    env: 'production' },
]

export default {
  name: 'Sidebar',
  props: { sessions: Array },
  emits: ['focus-session', 'switch-ticket', 'toggle-watcher'],
  setup() {
    const collapsed          = ref(true)
    const tiltTicketsExpanded = ref(false)
    const dbStates           = ref({})

    async function openDb(alias) {
      dbStates.value[alias] = 'busy'
      try {
        const res  = await fetch('/open-db', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ alias }) })
        const data = await res.json()
        dbStates.value[alias] = data.ok ? 'ok' : 'err'
      } catch { dbStates.value[alias] = 'err' }
      setTimeout(() => { delete dbStates.value[alias] }, 3000)
    }

    return { collapsed, tiltTicketsExpanded, dbStates, openDb, store, DB_ALIASES, PF_ALIASES }
  },
  computed: {
    tilt() { return store.tiltStatus },
  },
  template: `
    <aside class="sidepanel" :class="{ collapsed }">
      <button class="sidebar-toggle" @click="collapsed = !collapsed" :title="collapsed ? 'Expand sidebar' : 'Collapse sidebar'">
        {{ collapsed ? '▶' : '◀' }}
      </button>
      <div class="panel-content">

        <!-- Tilt -->
        <div style="padding-bottom:12px">
          <div class="panel-section-title">⚡ Tilt</div>
          <div class="tilt-active-row">
            <span class="tilt-active-id">{{ tilt.switching ? '⏳' : '⚡' }} {{ tilt.active }}</span>
            <span v-if="tilt.switching" class="tilt-switching">switching…</span>
          </div>
          <button class="tilt-main-btn" :class="{ active: tilt.active === 'MAIN' }"
                  @click="$emit('switch-ticket', 'MAIN')">
            ↩ MAIN{{ tilt.active === 'MAIN' ? ' ✓' : '' }}
          </button>
          <div class="watcher-row">
            <span class="watcher-dot" :class="tilt.watcherRunning ? 'on' : 'off'"></span>
            <span class="watcher-label">watcher {{ tilt.watcherRunning ? 'on' : 'off' }}</span>
            <button class="watcher-btn" @click="$emit('toggle-watcher')">
              {{ tilt.watcherRunning ? 'stop' : 'start' }}
            </button>
          </div>
          <template v-if="tilt.switchable.length">
            <button @click="tiltTicketsExpanded = !tiltTicketsExpanded"
                    style="display:flex;align-items:center;gap:5px;width:100%;background:none;border:none;color:#52525b;cursor:pointer;padding:4px 8px;border-radius:4px;font-size:0.55rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em;transition:color .15s">
              {{ tiltTicketsExpanded ? '▾' : '▸' }} tickets ({{ tilt.switchable.length }})
            </button>
            <div v-if="tiltTicketsExpanded">
              <button v-for="t in tilt.switchable" :key="t.id"
                      class="tilt-ticket-btn" :class="{ active: t.id === tilt.active }"
                      :title="t.title || t.id"
                      @click="$emit('switch-ticket', t.id)">
                {{ t.id === tilt.active ? '▶ ' : '' }}{{ t.id }}
              </button>
            </div>
          </template>
        </div>

        <!-- Sessions -->
        <div style="padding-bottom:12px">
          <div class="panel-section-title">🖥 Sessions</div>
          <button v-for="s in sessions" :key="s.name"
                  class="panel-btn" :title="s.workingDir"
                  @click="$emit('focus-session', s.name)">
            🖥 {{ s.name }}
          </button>
        </div>

        <!-- Databases -->
        <div style="padding-bottom:12px">
          <div class="panel-section-title">🗄 Databases</div>
          <button v-for="d in DB_ALIASES" :key="d.alias"
                  class="panel-btn" :class="dbStates[d.alias]" :data-env="d.env"
                  @click="openDb(d.alias)">
            🗄 {{ d.label }}
          </button>
          <div style="font-size:0.5rem;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:var(--muted);padding:10px 0 6px;border-top:1px solid var(--border);margin-top:6px">
            Port forwards
          </div>
          <button v-for="d in PF_ALIASES" :key="d.alias"
                  class="panel-btn" :class="dbStates[d.alias]" :data-env="d.env"
                  @click="openDb(d.alias)">
            ⇄ {{ d.label }}
          </button>
        </div>

      </div>
    </aside>
  `,
}
