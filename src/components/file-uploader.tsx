'use client'

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

    // Listen for upload completions from the Header component
    function handleImagesUpdated(event: Event) {
      const custom = event as CustomEvent<ExtendedImage[]>
      const newImages = custom.detail
      if (Array.isArray(newImages) && newImages.length > 0) {
        setImages((prev) => [...prev, ...newImages])
      }
    }

    window.addEventListener(
      'images-updated',
      handleImagesUpdated as EventListener
    )
    return () => {
      window.removeEventListener(
        'images-updated',
        handleImagesUpdated as EventListener
      )
    }
  }, [])

  if (!guest?.forename) {
    return null
  }

  return (
    <div className='space-y-8'>
      <div className='text-center mx-auto'>
        <p>please upload any photos and videos you have taken from the day</p>
        <p className='text-red-600 mt-4'>disclaimer</p>
        <p>
          all the photos can be viewed by everyone who has attended the wedding
        </p>
      </div>
      <ImageGrid images={images} isLoading={isLoading} />
    </div>
  )
}
