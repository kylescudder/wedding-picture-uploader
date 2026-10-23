import { UploadButton } from '@/utils/uploadthing'
import { useGuest } from '@/context/guest'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { imagesQueryOptions } from '@/lib/images'
import { toast } from 'sonner'

export default function Header() {
  const { guest } = useGuest()
  const queryClient = useQueryClient()
  const saveImages = useMutation({
    mutationFn: async (images: string[]) => {
      const response = await fetch('/api/images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ images, guestId: guest?.id })
      })

      if (!response.ok) throw new Error('failed to save images')
    },
    onSuccess: async (_, images) => {
      await queryClient.invalidateQueries({
        queryKey: imagesQueryOptions.queryKey
      })
      toast.success(
        `successfully uploaded ${images.length} image${images.length === 1 ? '' : 's'}!`
      )
    },
    onError: () => toast.error('failed to save images')
  })

  // Only show header actions after guest is set
  const canUpload = Boolean(guest?.forename)

  return (
    <header className='relative overflow-hidden'>
      {/* Header background and content */}
      <div className='bg-primary text-primary-foreground'>
        <div className='mx-auto max-w-5xl px-6 py-8 flex items-center justify-between gap-4'>
          <img
            src='/logo.svg'
            alt='Logo'
            aria-hidden
            width={150}
            height={150}
            className='h-auto block'
            fetchPriority='high'
          />

          {/* Upload button aligned to the right */}
          <div className='shrink-0'>
            {canUpload && (
              <UploadButton
                endpoint='imageUploader'
                input={{ forename: guest!.forename }}
                disabled={saveImages.isPending}
                onClientUploadComplete={async (res) => {
                  if (!res?.length) return
                  await saveImages
                    .mutateAsync(res.map((file) => file.ufsUrl))
                    .catch(() => undefined)
                }}
                onUploadError={(error: Error) => {
                  toast.error(`upload failed: ${error.message}`)
                }}
                appearance={{
                  button:
                    'bg-secondary! !important bg-white/15 hover:bg-white/25 text-white px-4 sm:px-6 py-2.5 rounded-full! font-medium whitespace-nowrap min-w-[160px] backdrop-blur',
                  allowedContent: 'hidden'
                }}
                content={{
                  button: 'upload',
                  allowedContent: 'only png, jpg, and gif files are allowed'
                }}
              />
            )}
          </div>
        </div>
      </div>

      {/* Wavy divider at the bottom of the header */}
      <div className='pointer-events-none relative -mb-1 select-none'>
        <img
          src='/wave.svg'
          alt='Wave divider'
          aria-hidden
          width={1920}
          height={50}
          className='w-full h-auto block'
          fetchPriority='high'
        />
      </div>
    </header>
  )
}
