'use client'

import dynamic from 'next/dynamic'
import { useParams } from 'next/navigation'

// react-leaflet relies on `window` — render the tracking map only on the client.
const TrackView = dynamic(() => import('@/components/track-view'), {
  ssr: false,
  loading: () => (
    <div className="flex h-screen items-center justify-center bg-background text-foreground">
      Жүктелуде...
    </div>
  ),
})

export default function TrackPage() {
  const params = useParams<{ token: string }>()
  return <TrackView token={params.token} />
}
