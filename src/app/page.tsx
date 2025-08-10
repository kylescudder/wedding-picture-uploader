import Image from 'next/image'
import FileUploader from '@/components/file-uploader'

export default function Home() {
  return (
    <div className='grid grid-rows-[20px_1fr_20px]min-h-screen p-8 pb-20 gap-16 sm:p-20 sm:pt-0 pt-0'>
      <main className='flex flex-col gap-[32px] row-start-2 items-center sm:items-start'>
        <div className='flex gap-4 items-center flex-col sm:flex-row'>
          <FileUploader />
        </div>
      </main>
    </div>
  )
}
