'use client'

import { SessionProvider } from 'next-auth/react'
import { EditOrderProvider } from '@/lib/contexts/EditOrderContext'
import { FavoritesProvider } from '@/lib/contexts/FavoritesContext'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <FavoritesProvider>
        <EditOrderProvider>
          {children}
        </EditOrderProvider>
      </FavoritesProvider>
    </SessionProvider>
  )
}
