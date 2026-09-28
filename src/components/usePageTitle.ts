import { useEffect } from 'react'

const SITE = 'The Rooms · Art Institute of Chicago'

export function usePageTitle(title: string | null) {
  useEffect(() => {
    document.title = title ? `${title} · ${SITE}` : SITE
  }, [title])
}
