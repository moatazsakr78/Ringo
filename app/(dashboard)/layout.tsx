'use client';

import { useSession } from 'next-auth/react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { status } = useSession();

  // Show loading state while session is being determined
  // This prevents content flash during hydration
  if (status === 'loading') {
    return (
      <div className="h-screen bg-[#2B3544] flex items-center justify-center">
        <div className="text-white text-xl">جاري التحميل...</div>
      </div>
    );
  }

  // Middleware handles all permission checks
  // If user reached here, they have access
  return <>{children}</>;
}
