import { useQuery } from '@tanstack/react-query'
import { usePNRStore } from '../stores/pnrStore'
import { checkPNRStatus } from '../services/pnrService'

export function usePNRAutoRefresh(pnrId: string, pnrNumber: string) {
  const { updatePNRStatus } = usePNRStore()

  const { isFetching, dataUpdatedAt } = useQuery({
    queryKey: ['pnr-status', pnrNumber],
    queryFn: async () => {
      const freshData = await checkPNRStatus(pnrNumber)
      updatePNRStatus(pnrId, freshData.status)
      return freshData
    },
    refetchInterval: 5 * 60 * 1000,
    staleTime: 4 * 60 * 1000,
    enabled: true,
  })

  const lastUpdated = dataUpdatedAt ? new Date(dataUpdatedAt) : null

  const minutesAgo = lastUpdated
    ? Math.round((Date.now() - lastUpdated.getTime()) / 60000)
    : null

  const lastUpdatedLabel = minutesAgo === null
    ? null
    : minutesAgo < 1
    ? 'just now'
    : `${minutesAgo}m ago`

  return { isFetching, lastUpdatedLabel }
}
