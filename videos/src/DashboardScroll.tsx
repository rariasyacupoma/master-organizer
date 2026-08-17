import React from 'react'
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from 'remotion'
import { TICKETS, EPICS } from './data'
import { TileCard } from './TileCard'

const BG      = '#0f0f0f'
const SURFACE = '#161616'

function EpicGroup({ epicId, opacity }: { epicId: string; opacity: number }) {
  const epic    = EPICS.find(e => e.id === epicId)!
  const tickets = TICKETS.filter(t => t.epic === epicId)

  return (
    <div style={{ opacity, marginBottom: 32 }}>
      {/* Epic header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16,
        paddingBottom: 10, borderBottom: '1px solid #2a2a2a',
      }}>
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: epic.color }} />
        <span style={{ fontSize: 15, fontWeight: 700, color: epic.color, letterSpacing: '0.02em' }}>{epic.title}</span>
        <span style={{ fontSize: 11, color: '#3f3f46', background: '#1f1f1f', border: '1px solid #2a2a2a', borderRadius: 4, padding: '1px 7px' }}>{tickets.length}</span>
      </div>

      {/* Tile grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 16 }}>
        {tickets.map(t => <TileCard key={t.id} ticket={t} />)}
      </div>
    </div>
  )
}

export function DashboardScroll() {
  const frame = useCurrentFrame()
  const { durationInFrames, fps } = useVideoConfig()

  // Estimate content height so we know total scroll distance
  // Each epic group is roughly: header (50) + rows of tiles
  // cass2pg: 4 tiles → 2 rows × ~450px = 950; security: 2 tiles → 1 row × 450 = 500; infra: 1 tile → 450
  // Total content ≈ 2600px, viewport = 900px → scroll ~1700px over 3s
  const CONTENT_HEIGHT = 2800
  const VIEWPORT_H     = 900
  const MAX_SCROLL     = CONTENT_HEIGHT - VIEWPORT_H

  // Ease-in-out scroll over the full duration, hold last 0.3s
  const holdFrames  = Math.floor(fps * 0.3)
  const scrollFrame = Math.min(frame, durationInFrames - holdFrames)
  const scrollY     = interpolate(
    scrollFrame,
    [0, durationInFrames - holdFrames],
    [0, MAX_SCROLL],
    { extrapolateRight: 'clamp', easing: t => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t }
  )

  // Fade in the whole scene
  const opacity = interpolate(frame, [0, fps * 0.25], [0, 1], { extrapolateRight: 'clamp' })

  return (
    <AbsoluteFill style={{ background: BG, fontFamily: 'system-ui, -apple-system, sans-serif', overflow: 'hidden' }}>
      {/* Top bar */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10,
        background: SURFACE, borderBottom: '1px solid #2a2a2a',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 32px', height: 56,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: '#e4e4e7', letterSpacing: '0.04em' }}>Master Organizer</span>
          <span style={{ fontSize: 11, color: '#52525b', background: '#1f1f1f', border: '1px solid #2a2a2a', borderRadius: 4, padding: '2px 8px' }}>Grid</span>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ border: '1px solid #52525b', color: '#a1a1aa', borderRadius: 6, padding: '6px 16px', fontSize: 12, fontWeight: 500 }}>⟳ Sync PRs</div>
          <div style={{ border: '1px solid #52525b', color: '#a1a1aa', borderRadius: 6, padding: '6px 16px', fontSize: 12, fontWeight: 500 }}>⬡ Deployments</div>
        </div>
      </div>

      {/* Scrolling content */}
      <div style={{ position: 'absolute', top: 56, left: 0, right: 0, opacity }}>
        <div style={{ transform: `translateY(${-scrollY}px)`, padding: '28px 32px' }}>
          {EPICS.map(e => <EpicGroup key={e.id} epicId={e.id} opacity={1} />)}
        </div>
      </div>

      {/* Vignette bottom fade */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: 80, pointerEvents: 'none',
        background: 'linear-gradient(to bottom, transparent, rgba(15,15,15,0.95))',
      }} />
    </AbsoluteFill>
  )
}
