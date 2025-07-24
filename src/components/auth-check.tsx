'use client'

import { useGuest } from '@/context/guest'
import Login from '@/components/login'
import { type ReactNode } from 'react'

export default function AuthCheck({ children }: { children: ReactNode }) {
  const { guest, isLoading } = useGuest()

  if (isLoading) {
    return (
      <div className='flex min-h-screen items-center justify-center'>
        <div className='text-foreground'>Loading...</div>
      </div>
    )
  }

  if (!guest?.forename) {
    return <Login />
  }

  return children
}
