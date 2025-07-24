'use client'

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode
} from 'react'
import type { Guest } from '@/server/db/schema'

interface GuestContextType {
  guest: Guest | null
  setGuest: (guest: Guest | null) => void
  isLoading: boolean
}

const GuestContext = createContext<GuestContextType | undefined>(undefined)

export function GuestProvider({ children }: { children: ReactNode }) {
  const [guest, setGuest] = useState<Guest | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Check if there's a guest in localStorage
    const storedGuest = localStorage.getItem('guest')
    if (storedGuest) {
      try {
        setGuest(JSON.parse(storedGuest))
      } catch (e) {
        console.error('Failed to parse stored guest:', e)
        localStorage.removeItem('guest')
      }
    }
    setIsLoading(false)
  }, [])

  const setGuestWithStorage = useCallback((newGuest: Guest | null) => {
    setGuest(newGuest)
    if (newGuest) {
      localStorage.setItem('guest', JSON.stringify(newGuest))
    } else {
      localStorage.removeItem('guest')
    }
  }, [])

  return (
    <GuestContext.Provider
      value={{
        guest,
        setGuest: setGuestWithStorage,
        isLoading
      }}
    >
      {children}
    </GuestContext.Provider>
  )
}

export function useGuest() {
  const context = useContext(GuestContext)
  if (context === undefined) {
    throw new Error('useGuest must be used within a GuestProvider')
  }
  return context
}
