import React from 'react'
import { Ticket, Stage, PR, EPICS } from './data'

const COLORS = {
  done:        '#22c55e',
  in_progress: '#7dd3fc',
  blocked:     '#f87171',
  waiting:     '#fbbf24',
  pending:     '#3f3f46',
  merged:      '#22c55e',
  open:        '#fbbf24',
  closed:      '#f87171',
  queued:      '#a78bfa',
  qa:          '#7dd3fc',
  prod:        '#22c55e',
}

function StatusDot({ status }: { status: string }) {
  return (
    <span style={{
      display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
      background: COLORS[status as keyof typeof COLORS] ?? '#71717a',
      flexShrink: 0,
    }} />
  )
}

function EnvTag({ label, state }: { label: string; state: 'on' | 'off' }) {
  return (
    <span style={{
      fontSize: 9, fontWeight: 700, letterSpacing: '0.06em',
      padding: '1px 5px', borderRadius: 3,
      background: state === 'on' ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.04)',
      color: state === 'on' ? '#4ade80' : '#3f3f46',
      border: `1px solid ${state === 'on' ? '#166534' : '#27272a'}`,
    }}>{label}</span>
  )
}

function PrChip({ pr }: { pr: PR }) {
  const icon = pr.state === 'merged' ? '✓' : '●'
  const iconColor = pr.state === 'merged' ? '#22c55e' : pr.state === 'open' ? '#fbbf24' : '#f87171'
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 5,
      background: 'rgba(255,255,255,0.03)',
      borderLeft: `3px solid ${iconColor}`,
      borderRadius: 5, padding: '4px 8px',
      fontSize: 11, color: '#a1a1aa',
    }}>
      <span style={{ color: iconColor, fontSize: 10 }}>{icon}</span>
      <span style={{ color: '#71717a' }}>{pr.repo.length > 16 ? pr.repo.slice(0, 15) + '…' : pr.repo}</span>
      <span style={{ color: '#3f3f46' }}>·</span>
      <span style={{ color: pr.state === 'merged' ? '#7dd3fc' : '#34d399', fontWeight: 700 }}>#{pr.number}</span>
      {pr.version && pr.state === 'merged' && (
        <span style={{ fontFamily: 'monospace', fontSize: 9, color: '#52525b' }}>{pr.version}</span>
      )}
      <div style={{ display: 'flex', gap: 3, marginLeft: 2 }}>
        <EnvTag label="Queued" state={pr.envState === 'queued' ? 'on' : 'off'} />
        <EnvTag label="QA"     state={pr.envState === 'qa' || pr.envState === 'prod' ? 'on' : 'off'} />
        <EnvTag label="Prod"   state={pr.envState === 'prod' ? 'on' : 'off'} />
      </div>
    </div>
  )
}

function StageRow({ stage }: { stage: Stage }) {
  const done  = stage.checklist.filter(i => i.done).length
  const total = stage.checklist.length
  const pct   = total ? (done / total) * 100 : 0

  const barColor = stage.status === 'done' ? '#22c55e'
                 : stage.status === 'blocked' ? '#f87171'
                 : stage.status === 'waiting' ? '#fbbf24'
                 : '#7dd3fc'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <StatusDot status={stage.status} />
        <span style={{ fontSize: 11, color: '#d4d4d8', flex: 1 }}>{stage.name}</span>
        <span style={{ fontSize: 10, color: '#52525b' }}>{done}/{total}</span>
      </div>
      <div style={{ height: 3, background: '#27272a', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: barColor, borderRadius: 2 }} />
      </div>
      {stage.blockerNote && (
        <div style={{ background: '#2a0808', border: '1px solid #991b1b', borderRadius: 4, padding: '3px 7px', fontSize: 9, color: '#fca5a5', display: 'flex', gap: 4 }}>
          <span>🚫</span><span>{stage.blockerNote}</span>
        </div>
      )}
      {stage.waitingNote && (
        <div style={{ background: '#1c1500', border: '1px solid #92400e', borderRadius: 4, padding: '3px 7px', fontSize: 9, color: '#fcd34d', display: 'flex', gap: 4 }}>
          <span>⏳</span><span>{stage.waitingNote}</span>
        </div>
      )}
      {stage.prs.map((pr, i) => <PrChip key={i} pr={pr} />)}
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const cfg: Record<string, { label: string; bg: string; color: string; border: string }> = {
    blocked:     { label: '🚫 Blocked',     bg: '#2a0808', color: '#fca5a5', border: '#991b1b' },
    waiting:     { label: '⏳ Waiting',     bg: '#1c1500', color: '#fcd34d', border: '#92400e' },
    in_progress: { label: '▶ In Progress',  bg: '#0c1a2e', color: '#7dd3fc', border: '#1e3a5f' },
    new:         { label: '◌ New',          bg: '#1a1a1a', color: '#71717a', border: '#3f3f46' },
  }
  const c = cfg[status]
  if (!c) return null
  return (
    <span style={{ fontSize: 9, padding: '2px 7px', borderRadius: 4, background: c.bg, color: c.color, border: `1px solid ${c.border}`, fontWeight: 600, letterSpacing: '0.04em' }}>
      {c.label}
    </span>
  )
}

export function TileCard({ ticket, scale = 1 }: { ticket: Ticket; scale?: number }) {
  const epic = EPICS.find(e => e.id === ticket.epic)
  const hasStages = !!ticket.stages

  const allItems = hasStages ? ticket.stages!.flatMap(s => s.checklist) : []
  const doneItems = allItems.filter(i => i.done).length
  const pct = allItems.length ? Math.round(doneItems / allItems.length * 100) : 0

  return (
    <div style={{
      position: 'relative',
      background: '#1a1a1a',
      border: '1px solid #2a2a2a',
      borderRadius: 12,
      padding: 20,
      display: 'flex',
      flexDirection: 'column',
      gap: 14,
      transform: `scale(${scale})`,
      transformOrigin: 'top left',
    }}>
      {/* WORKING badge */}
      {ticket.working && (
        <div style={{
          position: 'absolute', top: 12, right: 12,
          display: 'flex', alignItems: 'center', gap: 5,
          background: 'rgba(20,40,20,0.9)', border: '1px solid #16a34a',
          borderRadius: 6, padding: '4px 9px',
        }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#22c55e' }} />
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: '#4ade80' }}>WORKING</span>
          <span style={{ fontSize: 10, color: '#166534' }}>·</span>
          <span style={{ fontSize: 10, color: '#4ade80', opacity: 0.55 }}>14m</span>
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'space-between' }}>
          <span style={{ fontSize: 12, color: '#7dd3fc', fontWeight: 700 }}>{ticket.id}</span>
          <StatusBadge status={ticket.status} />
        </div>
        <span style={{ fontSize: 13, color: '#e4e4e7', fontWeight: 500, lineHeight: 1.4 }}>{ticket.title}</span>
      </div>

      {/* Services */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
        {ticket.services.map(s => (
          <span key={s} style={{ fontSize: 10, background: 'rgba(255,255,255,0.05)', border: '1px solid #3f3f46', borderRadius: 4, padding: '2px 7px', color: '#a1a1aa' }}>{s}</span>
        ))}
      </div>

      {/* StageChecklist view */}
      {hasStages && (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#71717a' }}>
              <span>Progress</span><span>{pct}%</span>
            </div>
            <div style={{ height: 4, background: '#27272a', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{ width: `${pct}%`, height: '100%', background: ticket.status === 'blocked' ? '#f87171' : ticket.status === 'waiting' ? '#fbbf24' : '#7dd3fc', borderRadius: 2 }} />
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {ticket.stages!.map((stage, i) => <StageRow key={i} stage={stage} />)}
          </div>
        </>
      )}

      {/* Simple view */}
      {!hasStages && (
        <>
          {ticket.latestUpdate && (
            <div style={{ fontSize: 11, color: '#a1a1aa', borderLeft: '2px solid #3f3f46', paddingLeft: 10 }}>
              {ticket.latestUpdate}
            </div>
          )}
          {ticket.nextSteps && ticket.nextSteps.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {ticket.nextSteps.map((s, i) => (
                <div key={i} style={{ fontSize: 11, color: '#71717a', display: 'flex', gap: 6 }}>
                  <span style={{ color: '#3f3f46' }}>▶</span><span>{s}</span>
                </div>
              ))}
            </div>
          )}
          {ticket.prs && ticket.prs.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {ticket.prs.map((pr, i) => <PrChip key={i} pr={pr} />)}
            </div>
          )}
        </>
      )}
    </div>
  )
}
