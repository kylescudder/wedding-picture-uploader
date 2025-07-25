import type { Image as DbImage } from '@/server/db/schema'

export interface ExtendedImage extends DbImage {
  uploadedBy: string
}
