'use client';

import { useEffect } from 'react';

export function AutoSelectInputProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const handleFocus = (event: FocusEvent) => {
      const target = event.target as HTMLElement;

      // تحقق من أن العنصر هو input أو textarea
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement
      ) {
        // استثناء الأنواع التي لا نريد تحديدها
        const excludedTypes = ['checkbox', 'radio', 'file', 'submit', 'button', 'reset', 'color', 'range'];

        if (target instanceof HTMLInputElement && excludedTypes.includes(target.type)) {
          return;
        }

        // تأخير بسيط للتأكد من أن الـ focus اكتمل
        setTimeout(() => {
          target.select();
        }, 0);
      }
    };

    // استخدام capture phase للتأكد من التقاط الحدث قبل أي handler آخر
    document.addEventListener('focus', handleFocus, true);

    return () => {
      document.removeEventListener('focus', handleFocus, true);
    };
  }, []);

  return <>{children}</>;
}
