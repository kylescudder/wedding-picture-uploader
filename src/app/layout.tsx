import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import { GuestProvider } from '@/context/guest'
import AuthCheck from '@/components/auth-check'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin']
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin']
})

export const metadata: Metadata = {
  title: 'Wedding Picture Uploader',
  description: 'Upload and share your wedding pictures'
}

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang='en'>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <GuestProvider>
          <AuthCheck>{children}</AuthCheck>
        </GuestProvider>
      </body>
    </html>
  )
}
