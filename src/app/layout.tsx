import type { Metadata } from 'next'
import '../styles/globals.css'
import { GuestProvider } from '@/context/guest'
import AuthCheck from '@/components/auth-check'
import { NextSSRPlugin } from '@uploadthing/react/next-ssr-plugin'
import { extractRouterConfig } from 'uploadthing/server'
import { ourFileRouter } from '@/app/api/uploadthing/core'
import { Toaster } from 'sonner'
import { cn } from '@/lib/utils'
import Header from '@/components/header'
import localFont from 'next/font/local'

const cooperBlack = localFont({ src: '../styles/fonts/COOPBL.woff' })

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
    <html lang='en' className={cn(cooperBlack.className)}>
      <body>
        <NextSSRPlugin routerConfig={extractRouterConfig(ourFileRouter)} />
        <Toaster />
        <GuestProvider>
          <AuthCheck>
            <Header />
            {children}
          </AuthCheck>
        </GuestProvider>
      </body>
    </html>
  )
}
