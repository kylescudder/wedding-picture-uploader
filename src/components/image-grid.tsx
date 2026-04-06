'use client'

import { useState } from 'react'
import { ImageModal } from './image-modal'
import type { ExtendedImage } from '@/types/image'

interface ImageGridProps {
  images: ExtendedImage[]
  isLoading?: boolean
}

function ImageTile({
  image,
  onClick
}: {
  image: ExtendedImage
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className='aspect-square relative overflow-hidden rounded-lg hover:opacity-95 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl group'
    >
      <img
        src={image.key}
        alt={`uploaded by ${image.uploadedBy.toLowerCase()}`}
        className='object-cover w-full h-full transition-transform duration-300 group-hover:scale-105'
      />
    </button>
  )
}

export function ImageGrid({ images, isLoading = false }: ImageGridProps) {
  const [selectedImage, setSelectedImage] = useState<ExtendedImage | null>(null)
  const [groupBy, setGroupBy] = useState<'none' | 'uploader'>('none')

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

  const grouped: Record<string, ExtendedImage[]> = {}
  if (groupBy === 'uploader') {
    for (const image of images) {
      const key = image.uploadedBy
      if (!grouped[key]) grouped[key] = []
      grouped[key].push(image)
    }
  }

  return (
    <>
      <div className='flex justify-end'>
        <select
          value={groupBy}
          onChange={(e) => setGroupBy(e.target.value as 'none' | 'uploader')}
          className='text-sm border border-gray-300 rounded-md px-2 py-1 bg-white'
        >
          <option value='none'>Default</option>
          <option value='uploader'>Group by uploader</option>
        </select>
      </div>

      {groupBy === 'none' ? (
        <div className='grid grid-cols-4 gap-4 mt-4'>
          {images.map((image) => (
            <ImageTile
              key={image.id}
              image={image}
              onClick={() => setSelectedImage(image)}
            />
          ))}
        </div>
      ) : (
        <div className='space-y-8 mt-4'>
          {Object.entries(grouped).map(([uploader, uploaderImages]) => (
            <div key={uploader}>
              <h3 className='text-sm font-medium text-gray-600 mb-3 capitalize'>
                {uploader.toLowerCase()}
              </h3>
              <div className='grid grid-cols-4 gap-4'>
                {uploaderImages.map((image) => (
                  <ImageTile
                    key={image.id}
                    image={image}
                    onClick={() => setSelectedImage(image)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

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
