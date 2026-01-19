'use client'

import { SessionProvider } from 'next-auth/react'
import { EditOrderProvider } from '@/lib/contexts/EditOrderContext'
import { FavoritesProvider } from '@/lib/contexts/FavoritesContext'
import { CurrentBranchProvider } from '@/lib/contexts/CurrentBranchContext'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <FavoritesProvider>
        <CurrentBranchProvider>
          <EditOrderProvider>
            {children}
          </EditOrderProvider>
        </CurrentBranchProvider>
      </FavoritesProvider>
    </SessionProvider>
  )
}
