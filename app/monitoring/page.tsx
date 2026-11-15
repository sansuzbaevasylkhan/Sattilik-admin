'use client'

import dynamic from 'next/dynamic'

// react-leaflet relies on `window` — render the map view only on the client.
const MonitoringView = dynamic(() => import('@/components/monitoring-view'), {
  ssr: false,
  loading: () => (
    <div className="flex h-screen items-center justify-center bg-background text-foreground">
      Жүктелуде...
    </div>
  ),
})

export default function MonitoringPage() {
  return <MonitoringView />
}
