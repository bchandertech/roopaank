import { useQuery } from '@tanstack/react-query'
import { categories } from '../../../mocks/categories'

// TODO: replace the mock with an axios call to GET /api/categories.
export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: async () => categories,
  })
}
