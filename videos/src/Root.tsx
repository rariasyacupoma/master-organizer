import React from 'react'
import { Composition } from 'remotion'
import { DashboardScroll } from './DashboardScroll'

export function RemotionRoot() {
  return (
    <Composition
      id="DashboardScroll"
      component={DashboardScroll}
      durationInFrames={90}  // 3 seconds at 30fps
      fps={30}
      width={1280}
      height={900}
    />
  )
}
