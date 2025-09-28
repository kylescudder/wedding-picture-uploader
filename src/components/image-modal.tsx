'use client'

import { useEffect, type MouseEvent } from 'react'
import { ChevronLeft, ChevronRight, X, Download } from 'lucide-react'
import type { ExtendedImage } from '@/types/image'

interface ImageModalProps {
  images: ExtendedImage[]
  currentImageId: string
  onClose: () => void
  onImageChange: (image: ExtendedImage) => void
}

export function ImageModal({
  images,
  currentImageId,
  onClose,
  onImageChange
}: ImageModalProps) {
  const currentIndex = images.findIndex((img) => img.id === currentImageId)
  const currentImage = images[currentIndex]

  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') handlePrevious()
      if (e.key === 'ArrowRight') handleNext()
    }

    document.addEventListener('keydown', handleKeydown)
    return () => document.removeEventListener('keydown', handleKeydown)
  }, [onClose, currentIndex])

  const handleNext = () => {
    if (currentIndex < images.length - 1) {
      onImageChange(images[currentIndex + 1])
    }
  }

  const handlePrevious = () => {
    if (currentIndex > 0) {
      onImageChange(images[currentIndex - 1])
    }
  }

  const handleBackdropClick = (e: MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  const handleDownload = async () => {
    try {
      const response = await fetch(currentImage.key)
      const blob = await response.blob()
      const blobUrl = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = blobUrl
      link.download = `wedding-photo-${currentImage.id}.jpg`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(blobUrl)
    } catch (error) {
      console.error('Failed to download image:', error)
    }
  }

  return (
    <div
      className='fixed inset-0 bg-black/80 z-50 flex items-center justify-center backdrop-blur-sm animate-in fade-in duration-300'
      onClick={handleBackdropClick}
    >
      <div className='absolute top-4 right-4 flex gap-4 z-[60]'>
        <button
          onClick={handleDownload}
          className='text-white/80 hover:text-white transition-all duration-200 hover:scale-110 animate-in fade-in slide-in-from-top-4 cursor-pointer'
          title='Download image'
        >
          <Download size={24} />
        </button>
        <button
          onClick={onClose}
          className='text-white/80 hover:text-white transition-all duration-200 hover:scale-110 animate-in fade-in slide-in-from-top-4 cursor-pointer'
          title='Close'
        >
          <X size={24} />
        </button>
      </div>

      {currentIndex > 0 && (
        <button
          onClick={handlePrevious}
          className='absolute left-4 top-1/2 -translate-y-1/2 text-white/80 hover:text-white p-3 backdrop-blur-sm bg-black/40 rounded-full transition-all duration-200 hover:scale-110 hover:bg-black/60 animate-in fade-in slide-in-from-left-8 z-[60] cursor-pointer'
        >
          <ChevronLeft size={32} />
        </button>
      )}

      {currentIndex < images.length - 1 && (
        <button
          onClick={handleNext}
          className='absolute right-4 top-1/2 -translate-y-1/2 text-white/80 hover:text-white p-3 backdrop-blur-sm bg-black/40 rounded-full transition-all duration-200 hover:scale-110 hover:bg-black/60 animate-in fade-in slide-in-from-right-8 z-[60] cursor-pointer'
        >
          <ChevronRight size={32} />
        </button>
      )}

      <div className='relative max-h-[90vh] max-w-[90vw] animate-in zoom-in-50 duration-300'>
        <img
          src={currentImage.key}
          alt={`Full size view, uploaded by ${currentImage.uploadedBy.toLowerCase()}`}
          className='max-h-[90vh] max-w-[90vw] object-contain select-none'
        />
        <div className='absolute bottom-4 left-4 bg-black/60 text-white px-3 py-2 rounded-md text-sm backdrop-blur-sm animate-in fade-in slide-in-from-bottom-4 duration-500 z-[60]'>
          Uploaded by {currentImage.uploadedBy.toLowerCase()}
        </div>
      </div>
    </div>
  )
}
