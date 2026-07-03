import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { dashboardService } from '@/services/dashboard.service'
import type { BookSimple, DashboardData, DiscoveryBook } from '@/types'

export function useDashboard() {
  return useQuery<DashboardData, Error>({
    queryKey: ['dashboard'],
    queryFn: () => dashboardService.getDashboard(),
  })
}

export function useDiscoveryBooks() {
  return useQuery<DiscoveryBook[], Error>({
    queryKey: ['discovery-books'],
    queryFn: () => dashboardService.getDiscoveryBooks(),
  })
}

/** Books in the current user's watchlist (used by the review-page selector). */
export function useWatchlistBooks() {
  return useQuery<BookSimple[], Error>({
    queryKey: ['watchlist', 'books'],
    queryFn: () => dashboardService.getWatchlistBooks(),
  })
}

/**
 * Toggle a book in/out of the watchlist with an optimistic update so the
 * library UI feels instant. Rolls back on error and refreshes the dashboard.
 */
export function useToggleWatchlist() {
  const queryClient = useQueryClient()

  return useMutation<
    { bookId: string },
    Error,
    { bookId: string; inWatchlist: boolean },
    { previous?: DiscoveryBook[] }
  >({
    mutationFn: ({ bookId, inWatchlist }) =>
      inWatchlist
        ? dashboardService.removeFromWatchlist(bookId)
        : dashboardService.addToWatchlist(bookId),
    onMutate: async ({ bookId, inWatchlist }) => {
      await queryClient.cancelQueries({ queryKey: ['discovery-books'] })
      const previous = queryClient.getQueryData<DiscoveryBook[]>(['discovery-books'])
      queryClient.setQueryData<DiscoveryBook[]>(['discovery-books'], (old) =>
        old?.map((b) => (b.id === bookId ? { ...b, inWatchlist: !inWatchlist } : b)),
      )
      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['discovery-books'], context.previous)
      }
    },
    onSettled: () => {
      // Reconcile with the server: discovery flags, the watchlist selector, and dashboard.
      queryClient.invalidateQueries({ queryKey: ['discovery-books'] })
      queryClient.invalidateQueries({ queryKey: ['watchlist', 'books'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}
