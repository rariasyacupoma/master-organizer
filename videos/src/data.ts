export type PR = {
  repo: string
  number: number
  state: 'open' | 'merged' | 'closed'
  version?: string
  envState?: 'queued' | 'qa' | 'prod' | null
}

export type Stage = {
  name: string
  status: 'done' | 'in_progress' | 'blocked' | 'waiting' | 'pending'
  checklist: { label: string; done: boolean }[]
  prs: PR[]
  blockerNote?: string
  waitingNote?: string
}

export type Ticket = {
  id: string
  title: string
  status: 'in_progress' | 'blocked' | 'waiting' | 'new'
  services: string[]
  epic: string
  stages?: Stage[]
  latestUpdate?: string
  nextSteps?: string[]
  prs?: PR[]
  working?: boolean
}

export const EPICS: { id: string; title: string; color: string }[] = [
  { id: 'epic-cass2pg',  title: 'Cassandra → Postgres Migration', color: '#7dd3fc' },
  { id: 'epic-security', title: 'Security Hardening',             color: '#f9a8d4' },
  { id: 'epic-infra',    title: 'Infrastructure',                 color: '#86efac' },
]

export const TICKETS: Ticket[] = [
  // ── Cass2PG ──────────────────────────────────────────────
  {
    id: 'CBP-37271', title: 'Migrate recent_org_records from Cassandra to Postgres',
    status: 'in_progress', services: ['apidao', 'rbac-service'], epic: 'epic-cass2pg',
    working: true,
    stages: [
      { name: 'Stage 1 — apidao: Add Timestamp', status: 'done',
        checklist: [{ label: 'PR created', done: true }, { label: 'PR merged', done: true }, { label: 'In QA', done: true }, { label: 'In Prod', done: true }],
        prs: [{ repo: 'apidao', number: 676, state: 'merged', version: '0.1.3400', envState: 'prod' }] },
      { name: 'Stage 2 — rbac-service: Dual-write', status: 'done',
        checklist: [{ label: 'PR created', done: true }, { label: 'PR merged', done: true }, { label: 'In QA', done: true }, { label: 'In Prod', done: true }],
        prs: [{ repo: 'rbac-service', number: 838, state: 'merged', version: '0.1.3585', envState: 'prod' }] },
      { name: 'Stage 3 — cass2pg-migrate: Bulk migration', status: 'done',
        checklist: [{ label: 'PR created', done: true }, { label: 'PR merged', done: true }, { label: 'Migration QA', done: true }, { label: 'Migration Prod', done: true }],
        prs: [{ repo: 'cass2pg-migrate', number: 229, state: 'merged', envState: 'prod' }] },
      { name: 'Stage 4 — rbac-service: Feature-flag reads', status: 'waiting',
        waitingNote: 'Waiting for flag validated in prod',
        checklist: [{ label: 'PR created', done: true }, { label: 'PR merged', done: true }, { label: 'Flag in QA', done: false }, { label: 'Flag in Prod', done: false }],
        prs: [{ repo: 'rbac-service', number: 839, state: 'merged', version: '0.1.3621', envState: 'prod' }] },
      { name: 'Stage 5 — rbac-service: Remove Cassandra code', status: 'in_progress',
        checklist: [{ label: 'PR created', done: true }, { label: 'PR merged', done: false }, { label: 'In QA', done: false }, { label: 'In Prod', done: false }],
        prs: [{ repo: 'rbac-service', number: 842, state: 'open' }] },
    ],
  },
  {
    id: 'CBP-52013', title: 'Remove Cassandra writes to asset_record_index in asset-service',
    status: 'waiting', services: ['asset-service'], epic: 'epic-cass2pg',
    stages: [
      { name: 'Stage 1 — Remove Cassandra read path', status: 'done',
        checklist: [{ label: 'PR created', done: true }, { label: 'PR merged', done: true }, { label: 'In QA', done: true }, { label: 'In Prod', done: true }],
        prs: [{ repo: 'asset-service', number: 1745, state: 'merged', version: '0.0.19157', envState: 'prod' }] },
      { name: 'Stage 2 — Remove Cassandra writes', status: 'done',
        checklist: [{ label: 'PR created', done: true }, { label: 'PR merged', done: true }, { label: 'In QA', done: true }, { label: 'In Prod', done: true }],
        prs: [{ repo: 'asset-service', number: 1760, state: 'merged', version: '0.0.19216', envState: 'prod' }] },
      { name: 'Stage 3 — Remove table infrastructure', status: 'waiting',
        checklist: [{ label: 'PR created', done: true }, { label: 'PR merged', done: true }, { label: 'In QA', done: false }, { label: 'In Prod', done: false }],
        prs: [{ repo: 'asset-service', number: 1765, state: 'merged', version: '0.0.19262', envState: 'queued' }] },
    ],
  },
  {
    id: 'CBP-52015', title: 'Remove Cassandra writes to asset_profile_links in asset-service',
    status: 'in_progress', services: ['asset-service'], epic: 'epic-cass2pg',
    stages: [
      { name: 'Stage 1 — Remove Cassandra reads', status: 'in_progress',
        checklist: [{ label: 'PR created', done: true }, { label: 'PR merged', done: true }, { label: 'In QA', done: false }, { label: 'In Prod', done: false }],
        prs: [{ repo: 'asset-service', number: 1764, state: 'merged', version: '0.0.19256', envState: 'qa' }] },
      { name: 'Stage 2 — Remove Cassandra writes', status: 'in_progress',
        checklist: [{ label: 'PR created', done: true }, { label: 'PR merged', done: false }, { label: 'In QA', done: false }, { label: 'In Prod', done: false }],
        prs: [{ repo: 'asset-service', number: 1768, state: 'open' }] },
      { name: 'Stage 3 — Infrastructure cleanup', status: 'pending',
        checklist: [{ label: 'PR created', done: false }, { label: 'PR merged', done: false }, { label: 'In QA', done: false }, { label: 'In Prod', done: false }],
        prs: [] },
    ],
  },
  {
    id: 'CBP-47356', title: 'Migrate profile_group_finding_remediation from Cassandra',
    status: 'blocked', services: ['asset-service'], epic: 'epic-cass2pg',
    stages: [
      { name: 'Stage 1 — Remove Cassandra reads and flags', status: 'in_progress',
        blockerNote: 'Waiting for ASPM team to confirm feature tested in Prod',
        checklist: [{ label: 'PR created', done: true }, { label: 'PR merged', done: false }, { label: 'In QA', done: false }, { label: 'In Prod', done: false }],
        prs: [{ repo: 'asset-service', number: 1713, state: 'open' }] },
      { name: 'Stage 2 — Remove Cassandra writes', status: 'pending',
        checklist: [{ label: 'PR created', done: false }, { label: 'PR merged', done: false }, { label: 'In QA', done: false }, { label: 'In Prod', done: false }],
        prs: [] },
    ],
  },
  // ── Security ─────────────────────────────────────────────
  {
    id: 'CBP-53933', title: 'Cross-IDOR on Repository-Service Method ListBranchAutomations',
    status: 'in_progress', services: ['repository-service'], epic: 'epic-security',
    latestUpdate: 'IDOR identified in ListBranchAutomations — implementation in progress.',
    nextSteps: ['Add OrgId/ServiceId authorization check', 'Add regression test', 'Open PR'],
    prs: [],
  },
  {
    id: 'CBP-54481', title: 'Revamp tests in Roles CRUD in rbac-service',
    status: 'in_progress', services: ['rbac-service'], epic: 'epic-security',
    latestUpdate: 'PR #820 merged — Roles CRUD tests split into per-method files.',
    nextSteps: [],
    prs: [{ repo: 'rbac-service', number: 820, state: 'merged', version: '0.1.3283', envState: 'prod' }],
  },
  // ── Infra ─────────────────────────────────────────────────
  {
    id: 'CBP-43509', title: 'Separate Keycloak configuration script into its own chart',
    status: 'in_progress', services: ['keycloak', 'platform-helmfiles'], epic: 'epic-infra',
    latestUpdate: 'Both PRs merged — keycloak chart published at 0.0.4509.',
    nextSteps: ['Test chart deployment in QA', 'Test chart deployment in Prod'],
    prs: [
      { repo: 'keycloak', number: 509, state: 'merged', version: '0.0.4151', envState: 'prod' },
      { repo: 'keycloak', number: 513, state: 'merged', version: '0.0.4509', envState: 'qa' },
      { repo: 'platform-helmfiles', number: 6262, state: 'merged', envState: 'queued' },
    ],
  },
]
