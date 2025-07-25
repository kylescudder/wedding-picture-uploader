'use client'

import { useState } from 'react'
import { ImageModal } from './image-modal'
import { toTitleCase } from '@/lib/utils'
import type { ExtendedImage } from '@/types/image'

interface ImageGridProps {
  images: ExtendedImage[]
  isLoading?: boolean
}

export function ImageGrid({ images, isLoading = false }: ImageGridProps) {
  const [selectedImage, setSelectedImage] = useState<ExtendedImage | null>(null)

  if (isLoading) {
    return (
      <div className='grid grid-cols-4 gap-4 mt-8'>
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className='aspect-square bg-gradient-to-r from-gray-200 to-gray-300 rounded-lg animate-in fade-in duration-700 ease-in-out'
          />
        ))}
      </div>
    )
  }

  if (!images.length) return null

  return (
    <>
      <div className='grid grid-cols-4 gap-4 mt-8'>
        {images.map((image) => (
          <button
            key={image.id}
            onClick={() => setSelectedImage(image)}
            className='aspect-square relative overflow-hidden rounded-lg hover:opacity-95 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl group'
          >
            <img
              src={image.key}
              alt={`Uploaded by ${toTitleCase(image.uploadedBy)}`}
              className='object-cover w-full h-full transition-transform duration-300 group-hover:scale-105'
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
