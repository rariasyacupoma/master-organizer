import { reactive } from 'vue'

export const store = reactive({
  tickets: [],
  deployments: { qa: {}, prod: {} },
  versioning: {},
  epics: [],
  workingStatus: {},
  tiltStatus: { active: 'MAIN', switching: false, watcherRunning: false, switchable: [] },
  focusedTicketId: null,
})

export function versionGte(a, b) {
  const parts = s => s.replace(/[^0-9.]/g, '').split('.').map(Number)
  const ap = parts(a), bp = parts(b)
  for (let i = 0; i < Math.max(ap.length, bp.length); i++) {
    const d = (ap[i] || 0) - (bp[i] || 0)
    if (d > 0) return true
    if (d < 0) return false
  }
  return true
}

export function envTagsForPr(pr) {
  if (pr.state !== 'merged' || !pr.version) return null
  const svc       = pr.repo
  const qaVer     = store.deployments.qa[svc]?.version
  const prodVer   = store.deployments.prod[svc]?.version
  const queuedVer = store.versioning[svc]
  const inQA      = qaVer     && versionGte(qaVer,     pr.version)
  const inProd    = prodVer   && versionGte(prodVer,   pr.version)
  const inQueue   = queuedVer && versionGte(queuedVer, pr.version)
  return {
    queued: { on: !!(inQueue && !inQA && !inProd), label: 'Queued', title: inQueue ? `Queued for QA (${queuedVer})` : 'Not queued' },
    qa:     { on: !!(inQA && !inProd),             label: 'QA',     title: inQA   ? `In QA (${qaVer})`              : 'Not in QA'  },
    prod:   { on: !!inProd,                        label: 'Prod',   title: inProd ? `In Prod (${prodVer})`          : 'Not in Prod' },
  }
}
