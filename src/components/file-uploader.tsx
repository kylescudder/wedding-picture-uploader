import { useQuery } from '@tanstack/react-query'
import { ImageGrid } from './image-grid'
import { imagesQueryOptions } from '@/lib/images'

export default function FileUploader() {
  const {
    data: images = [],
    isPending,
    isError,
    refetch
  } = useQuery(imagesQueryOptions)

  return (
    <div className='space-y-8'>
      <div className='mx-auto text-center'>
        <p>please upload any photos and videos you have taken from the day</p>
        <p className='mt-4 text-red-600'>disclaimer</p>
        <p>
          all the photos can be viewed by everyone who has attended the wedding
        </p>
      </div>
      {isError ? (
        <div role='alert' className='space-y-2 text-center'>
          <p>failed to load images</p>
          <button className='underline' onClick={() => void refetch()}>
            try again
          </button>
        </div>
      ) : (
        <ImageGrid images={images} isLoading={isPending} />
      )}
    </div>
  )
}
