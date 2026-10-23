import { createFileRoute } from '@tanstack/react-router'
import FileUploader from '@/components/file-uploader'

export const Route = createFileRoute('/')({ component: Home })

function Home() {
  return (
    <div className='min-h-screen p-8 pb-20 sm:p-20 sm:pt-0 pt-0'>
      <main className='mx-auto w-full max-w-5xl'>
        <FileUploader />
      </main>
    </div>
  )
}
