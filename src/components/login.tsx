'use client'

import { useState } from 'react'
import { useGuest } from '@/context/guest'

export default function Login() {
  const [forename, setForename] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const { setGuest } = useGuest()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmedForename = forename.trim()
    if (!trimmedForename) return

    setError('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/guest/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ forename: trimmedForename })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to validate guest')
      }

      setGuest(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to validate guest')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className='flex min-h-screen items-center justify-center bg-background px-4'>
      <div className='w-full max-w-md space-y-6 rounded-lg border border-border bg-card p-8 shadow-lg'>
        <h2 className='text-center text-2xl font-bold text-card-foreground'>
          welcome to the wedding picture uploader
        </h2>
        <form onSubmit={handleSubmit} className='space-y-4'>
          <div>
            <input
              id='forename'
              type='text'
              value={forename}
              onChange={(e) => {
                setForename(e.target.value)
                setError('')
              }}
              disabled={isLoading}
              className='mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50'
              placeholder='enter your first name'
              required
            />
            {error && <p className='mt-2 text-sm text-destructive'>{error}</p>}
          </div>
          <button
            type='submit'
            disabled={isLoading}
            className='w-full rounded-md bg-secondary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-secondary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50'
          >
            {isLoading ? 'checking...' : 'continue'}
          </button>
        </form>
      </div>
    </div>
  )
}
