import {
  createRootRouteWithContext,
  HeadContent,
  Outlet,
  Scripts
} from '@tanstack/react-router'
import { QueryClientProvider, type QueryClient } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import { GuestProvider } from '@/context/guest'
import AuthCheck from '@/components/auth-check'
import Header from '@/components/header'
import stylesheet from '@/styles/globals.css?url'

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()(
  {
    head: () => ({
      meta: [
        { charSet: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { title: 'Wedding Picture Uploader' },
        {
          name: 'description',
          content: 'Upload and share your wedding pictures'
        }
      ],
      links: [
        { rel: 'stylesheet', href: stylesheet },
        { rel: 'icon', href: '/favicon.ico', sizes: 'any' }
      ]
    }),
    component: RootComponent
  }
)

function RootComponent() {
  const { queryClient } = Route.useRouteContext()

  return (
    <html lang='en'>
      <head>
        <HeadContent />
      </head>
      <body>
        <QueryClientProvider client={queryClient}>
          <Toaster />
          <GuestProvider>
            <AuthCheck>
              <Header />
              <Outlet />
            </AuthCheck>
          </GuestProvider>
        </QueryClientProvider>
        <Scripts />
      </body>
    </html>
  )
}
