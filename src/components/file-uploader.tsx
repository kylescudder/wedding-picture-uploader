'use client'

import { UploadButton } from '@/utils/uploadthing'
import { useGuest } from '@/context/guest'
import { ImageGrid } from './image-grid'
import { toast } from 'sonner'
import { useState, useEffect } from 'react'
import type { ReactNode } from 'react'
import type { ExtendedImage } from '@/types/image'

interface ImageGridProps {
  images: ExtendedImage[]
  isLoading?: boolean
}

export default function FileUploader(): ReactNode {
  const { guest } = useGuest()
  const [images, setImages] = useState<ExtendedImage[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchImages() {
      try {
        const response = await fetch('/api/images')
        if (!response.ok) {
          throw new Error('Failed to fetch images')
        }
        const images = await response.json()
        setImages(images)
      } catch (error) {
        console.error('Error fetching images:', error)
        toast.error('Failed to load images')
      } finally {
        setIsLoading(false)
      }
    }

    fetchImages()
  }, [])

  if (!guest?.forename) {
    return null
  }

  return (
    <div className='space-y-8'>
      <div className='bg-yellow-50 border-l-4 border-yellow-400 p-4'>
        <div className='flex'>
          <div className='flex-grow'>
            <p className='text-sm text-yellow-700'>
              Please note: All uploaded photos are visible to everyone. Only upload photos you are comfortable sharing with other guests.
            </p>
          </div>
        </div>
      </div>

      <div className='w-full max-w-2xl mx-auto text-center'>
        <UploadButton
          endpoint='imageUploader'
          input={{ forename: guest.forename }}
          onClientUploadComplete={async (res) => {
            if (res) {
              const imageUrls = res.map((file: { url: string }) => file.url)

              try {
                const response = await fetch('/api/images', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({ images: imageUrls, guestId: guest.id })
                })

                if (!response.ok) {
                  throw new Error('Failed to save images')
                }

                const savedImages = await response.json()
                setImages((prev) => [...prev, ...savedImages])
                toast.success(
                  `Successfully uploaded ${imageUrls.length} image${imageUrls.length === 1 ? '' : 's'}!`
                )
              } catch (error) {
                console.error('Error saving images:', error)
                toast.error('Failed to save images')
              }
            }
          }}
          onUploadError={(error: Error) => {
            toast.error(`Upload failed: ${error.message}`)
          }}
          appearance={{
            button:
              'bg-blue-600 hover:bg-blue-700 text-white px-4 sm:px-6 py-2.5 rounded-md font-medium whitespace-nowrap min-w-[160px]'
          }}
        />
      </div>

      <ImageGrid images={images} isLoading={isLoading} />
    </div>
  )
}
