import { useState } from 'react'
import { ImageModal } from './image-modal'
import type { ExtendedImage } from '@/types/image'

interface ImageGridProps {
  images: ExtendedImage[]
  isLoading?: boolean
}

export function ImageGrid({ images, isLoading = false }: ImageGridProps) {
  const [selectedImage, setSelectedImage] = useState<ExtendedImage | null>(null)

  if (isLoading) {
    return (
      <div className='mt-8 grid grid-cols-4 gap-4'>
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className='aspect-square animate-in rounded-lg bg-gradient-to-r from-gray-200 to-gray-300 duration-700 ease-in-out fade-in'
          />
        ))}
      </div>
    )
  }

  if (!images.length) return null

  return (
    <>
      <div className='mt-8 grid grid-cols-4 gap-4'>
        {images.map((image) => (
          <button
            key={image.id}
            onClick={() => setSelectedImage(image)}
            className='group relative aspect-square overflow-hidden rounded-lg transition-all duration-300 hover:scale-[1.02] hover:opacity-95 hover:shadow-xl'
          >
            <img
              src={image.key}
              alt={`uploaded by ${image.uploadedBy.toLowerCase()}`}
              className='h-full w-full object-cover transition-transform duration-300 group-hover:scale-105'
            />
          </button>
        ))}
      </div>

      {selectedImage && (
        <ImageModal
          images={images}
          currentImageId={selectedImage.id}
          onClose={() => setSelectedImage(null)}
          onImageChange={(image) => setSelectedImage(image)}
        />
      )}
    </>
  )
}
