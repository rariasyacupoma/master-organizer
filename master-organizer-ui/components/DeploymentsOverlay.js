import { ref } from 'vue'

function versionClass(env, other) {
  if (!env) return 'only'
  if (!other) return ''
  const parts = s => s.replace(/[^0-9.]/g, '').split('.').map(Number)
  const ap = parts(env.version), bp = parts(other.version)
  for (let i = 0; i < Math.max(ap.length, bp.length); i++) {
    const d = (ap[i] || 0) - (bp[i] || 0)
    if (d > 0) return 'ahead'
    if (d < 0) return 'behind'
  }
  return ''
}

export default {
  name: 'DeploymentsOverlay',
  props: { visible: Boolean },
  emits: ['close'],
  setup() {
    const loading  = ref(false)
    const qa       = ref({})
    const prod     = ref({})
    const updated  = ref('')

    async function load() {
      loading.value = true
      try {
        const res = await fetch('/deployments')
        const data = await res.json()
        qa.value   = data.qa   || {}
        prod.value = data.prod || {}
        const all = new Set([...Object.keys(qa.value), ...Object.keys(prod.value)])
        const aheadCount = [...all].filter(s => qa.value[s] && prod.value[s] && versionClass(qa.value[s], prod.value[s]) === 'ahead').length
        updated.value = `${all.size} services · ${aheadCount} ahead in QA`
      } finally { loading.value = false }
    }

    return { loading, qa, prod, updated, load, versionClass }
  },
  computed: {
    allServices() {
      return [...new Set([...Object.keys(this.qa), ...Object.keys(this.prod)])].sort()
    },
  },
  watch: {
    visible(v) { if (v) this.load() },
  },
  template: `
    <div id="deploy-overlay" :class="{ visible }">
      <div id="deploy-header">
        <button id="deploy-back" @click="$emit('close')">← Back</button>
        <span id="deploy-title">Deployments</span>
        <span id="deploy-updated">{{ updated }}</span>
      </div>
      <div id="deploy-body">
        <div v-if="loading" style="color:var(--muted);font-size:0.75rem;padding:20px">Loading…</div>
        <template v-else>
          <div class="deploy-legend">
            <span><span class="legend-dot" style="background:#4ade80"></span>Ahead of other env</span>
            <span><span class="legend-dot" style="background:#f87171"></span>Behind other env</span>
            <span><span class="legend-dot" style="background:#94a3b8"></span>Not deployed in this env</span>
          </div>
          <div class="deploy-grid">
            <div class="deploy-env-card">
              <div class="deploy-env-header qa">QA — {{ Object.keys(qa).length }} services</div>
              <table class="deploy-table">
                <thead><tr><th>Service</th><th>Version</th><th>Deployed</th></tr></thead>
                <tbody>
                  <tr v-for="svc in allServices" :key="svc">
                    <td class="deploy-service" :style="!qa[svc] ? 'color:var(--muted)' : ''">{{ svc }}</td>
                    <td class="deploy-version" :class="qa[svc] ? versionClass(qa[svc], prod[svc]) : 'only'">
                      {{ qa[svc] ? qa[svc].version : '— not deployed' }}
                    </td>
                    <td class="deploy-date">{{ qa[svc] ? qa[svc].deployedAt || '' : '' }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div class="deploy-env-card">
              <div class="deploy-env-header prod">PROD — {{ Object.keys(prod).length }} services</div>
              <table class="deploy-table">
                <thead><tr><th>Service</th><th>Version</th><th>Deployed</th></tr></thead>
                <tbody>
                  <tr v-for="svc in allServices" :key="svc">
                    <td class="deploy-service" :style="!prod[svc] ? 'color:var(--muted)' : ''">{{ svc }}</td>
                    <td class="deploy-version" :class="prod[svc] ? versionClass(prod[svc], qa[svc]) : 'only'">
                      {{ prod[svc] ? prod[svc].version : '— not deployed' }}
                    </td>
                    <td class="deploy-date">{{ prod[svc] ? prod[svc].deployedAt || '' : '' }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </template>
      </div>
    </div>
  `,
}
