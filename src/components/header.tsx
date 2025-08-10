'use client'

import { UploadButton } from '@/utils/uploadthing'
import { useGuest } from '@/context/guest'
import Image from 'next/image'
import { toast } from 'sonner'

export default function Header() {
  const { guest } = useGuest()

  // Only show header actions after guest is set
  const canUpload = Boolean(guest?.forename)

  return (
    <header className='relative overflow-hidden'>
      {/* Header background and content */}
      <div className='bg-primary text-primary-foreground'>
        <div className='mx-auto max-w-5xl px-6 py-8 flex items-center justify-between gap-4'>
          <Image
            src='/logo.svg'
            alt='Logo'
            aria-hidden
            width={150}
            height={150}
            className='h-auto block'
            priority
          />

          {/* Upload button aligned to the right */}
          <div className='shrink-0'>
            {canUpload && (
              <UploadButton
                endpoint='imageUploader'
                input={{ forename: guest!.forename }}
                onClientUploadComplete={async (res) => {
                  if (!res) return
                  const imageUrls = res.map((file: { url: string }) => file.url)

                  try {
                    const response = await fetch('/api/images', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        images: imageUrls,
                        guestId: guest!.id
                      })
                    })

                    if (!response.ok) {
                      throw new Error('Failed to save images')
                    }

                    const savedImages = await response.json()

                    // Notify others (e.g., FileUploader) that new images are available
                    if (typeof window !== 'undefined') {
                      window.dispatchEvent(
                        new CustomEvent('images-updated', {
                          detail: savedImages
                        })
                      )
                    }

                    toast.success(
                      `Successfully uploaded ${imageUrls.length} image${imageUrls.length === 1 ? '' : 's'}!`
                    )
                  } catch (error) {
                    console.error('Error saving images:', error)
                    toast.error('Failed to save images')
                  }
                }}
                onUploadError={(error: Error) => {
                  toast.error(`Upload failed: ${error.message}`)
                }}
                appearance={{
                  button:
                    'bg-primary !important bg-white/15 hover:bg-white/25 text-white px-4 sm:px-6 py-2.5 rounded-md font-medium whitespace-nowrap min-w-[160px] backdrop-blur'
                }}
              />
            )}
          </div>
        </div>
      </div>

      {/* Wavy divider at the bottom of the header */}
      <div className='pointer-events-none relative -mb-1 select-none'>
        <Image
          src='/wave.svg'
          alt='Wave divider'
          aria-hidden
          width={1920}
          height={50}
          className='w-full h-auto block'
          priority
        />
      </div>
    </header>
  )
}
