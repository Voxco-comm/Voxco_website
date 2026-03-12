import { AuthProvider } from '@/components/AuthContext'
import { IdleTimeoutProvider } from '@/components/IdleTimeoutProvider'
import { NotificationProvider } from '@/components/NotificationContext'
import Header from '@/components/Header'
import ToastContainer from '@/components/ui/Toast'
import DisabledUserGuard from '@/components/DisabledUserGuard'
import CookieBanner from '@/components/CookieBanner'
import './globals.css'
import { createClient } from '@/lib/supabase/server'
import { ReactNode } from 'react'

export const metadata = {
  title: 'Voxco Number Ordering Portal',
  description: 'Order phone numbers and manage your communications',
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <html lang="en" className="scroll-smooth">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-sans antialiased bg-gray-50 text-gray-900">
        <AuthProvider>
          <IdleTimeoutProvider>
            <NotificationProvider>
              {user && <Header />}
              <DisabledUserGuard>
                <div className="page-transition">
                  {children}
                </div>
              </DisabledUserGuard>
              <CookieBanner />
              <ToastContainer />
            </NotificationProvider>
          </IdleTimeoutProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
