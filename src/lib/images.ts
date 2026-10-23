import { queryOptions } from '@tanstack/react-query'
import type { ExtendedImage } from '@/types/image'

export const imagesQueryOptions = queryOptions({
  queryKey: ['images'],
  queryFn: async (): Promise<ExtendedImage[]> => {
    const response = await fetch('/api/images')
    if (!response.ok) throw new Error('Failed to fetch images')
    return response.json()
  }
})
