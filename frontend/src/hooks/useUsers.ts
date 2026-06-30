import { useQuery } from '@tanstack/react-query'
import { userService, type AdminUser } from '@/services/user.service'

export function useUsers() {
  return useQuery<AdminUser[], Error>({
    queryKey: ['users'],
    queryFn: () => userService.getUsers(),
  })
}
