'use client';

import { useEffect, useCallback, useRef } from 'react';

/**
 * useBackButton - Custom hook for handling browser back button
 *
 * This hook manages the browser's back button behavior to:
 * 1. Close modals/overlays when back is pressed (instead of navigating away)
 * 2. Keep the user on the store page as the "maximum back" limit
 * 3. Provide a smooth user experience on mobile devices
 *
 * Usage:
 * const { pushState, canGoBack } = useBackButton({
 *   onBack: () => closeCurrentModal(),
 *   isActive: isAnyModalOpen
 * });
 */

interface UseBackButtonOptions {
  /**
   * Callback function to execute when back button is pressed
   * This should close the current modal/overlay
   */
  onBack?: () => void;

  /**
   * Whether a modal/overlay is currently open
   * When true, back button will trigger onBack instead of navigation
   */
  isActive?: boolean;

  /**
   * Unique identifier for this modal/overlay state
   * Helps distinguish between different modals
   */
  stateId?: string;
}

interface BackButtonState {
  type: 'store-modal';
  modalId: string;
  timestamp: number;
}

export function useBackButton({
  onBack,
  isActive = false,
  stateId = 'default'
}: UseBackButtonOptions = {}) {
  // Track if we've pushed a state for the current modal
  const hasStatePushed = useRef(false);
  const isHandlingPopState = useRef(false);

  // Push state when modal opens
  useEffect(() => {
    if (isActive && !hasStatePushed.current) {
      const state: BackButtonState = {
        type: 'store-modal',
        modalId: stateId,
        timestamp: Date.now()
      };

      window.history.pushState(state, '', window.location.href);
      hasStatePushed.current = true;
    }

    // Reset when modal closes
    if (!isActive) {
      hasStatePushed.current = false;
    }
  }, [isActive, stateId]);

  // Handle popstate (back button)
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      // Prevent recursive handling
      if (isHandlingPopState.current) return;

      // If a modal is active and back was pressed
      if (isActive && onBack) {
        isHandlingPopState.current = true;

        // Call the onBack handler to close the modal
        onBack();

        // Reset the flag after a short delay
        setTimeout(() => {
          isHandlingPopState.current = false;
        }, 100);
      }
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [isActive, onBack]);

  // Manual push state function (for custom scenarios)
  const pushState = useCallback((id: string = stateId) => {
    const state: BackButtonState = {
      type: 'store-modal',
      modalId: id,
      timestamp: Date.now()
    };
    window.history.pushState(state, '', window.location.href);
  }, [stateId]);

  return {
    pushState,
    hasStatePushed: hasStatePushed.current
  };
}

/**
 * useStoreBackBarrier - Hook to prevent users from leaving the store page
 *
 * This creates a "barrier" that keeps users on the store page
 * even when they press the back button multiple times.
 *
 * Usage:
 * useStoreBackBarrier(); // Call once at the top level of your store component
 */
export function useStoreBackBarrier() {
  const isInitialized = useRef(false);

  useEffect(() => {
    // Only initialize once
    if (isInitialized.current) return;
    isInitialized.current = true;

    // Replace current state with our store state
    const storeState = { type: 'store-root', timestamp: Date.now() };
    window.history.replaceState(storeState, '', window.location.href);

    // Push an additional state as a barrier
    window.history.pushState(storeState, '', window.location.href);

    const handlePopState = (event: PopStateEvent) => {
      const state = event.state;

      // If user is trying to leave the store (no state or different state type)
      // Push them back to the store
      if (!state || state.type !== 'store-modal') {
        // Re-push the barrier state to keep them on the store
        window.history.pushState(
          { type: 'store-root', timestamp: Date.now() },
          '',
          window.location.href
        );
      }
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);
}

/**
 * Combined hook for full back button management in the store
 *
 * This combines both:
 * 1. Store back barrier (keeps user on store page)
 * 2. Modal back handling (closes modals on back press)
 */
export function useStoreBackHandler(modals: {
  id: string;
  isOpen: boolean;
  onClose: () => void;
}[]) {
  const activeModalRef = useRef<string | null>(null);
  const isHandlingBack = useRef(false);

  useEffect(() => {
    // Initialize store barrier
    const storeState = { type: 'store-root', timestamp: Date.now() };
    window.history.replaceState(storeState, '', window.location.href);
    window.history.pushState(storeState, '', window.location.href);
  }, []);

  // Track modal states and push/manage history
  useEffect(() => {
    const openModal = modals.find(m => m.isOpen);

    if (openModal && activeModalRef.current !== openModal.id) {
      // A new modal opened - push state
      const modalState = {
        type: 'store-modal',
        modalId: openModal.id,
        timestamp: Date.now()
      };
      window.history.pushState(modalState, '', window.location.href);
      activeModalRef.current = openModal.id;
    } else if (!openModal && activeModalRef.current) {
      // All modals closed
      activeModalRef.current = null;
    }
  }, [modals]);

  // Handle back button
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      if (isHandlingBack.current) return;

      const openModal = modals.find(m => m.isOpen);

      if (openModal) {
        // Close the open modal
        isHandlingBack.current = true;
        openModal.onClose();

        setTimeout(() => {
          isHandlingBack.current = false;
        }, 100);
      } else {
        // No modal open - user trying to leave store
        // Push them back
        window.history.pushState(
          { type: 'store-root', timestamp: Date.now() },
          '',
          window.location.href
        );
      }
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [modals]);
}

export default useBackButton;
