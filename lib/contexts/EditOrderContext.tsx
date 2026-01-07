'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';

// Types
interface OrderItem {
  id: string;
  product_id: string;
  name: string;
  quantity: number;
  price: number;
  image?: string;
  isNew?: boolean; // Flag for newly added items
  isDeleted?: boolean; // Flag for items to be deleted
  isModified?: boolean; // Flag for modified items
}

interface EditOrderData {
  orderId: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  items: OrderItem[];
  originalTotal: number;
}

interface EditOrderContextType {
  // State
  isEditMode: boolean;
  editOrderData: EditOrderData | null;
  pendingItems: OrderItem[]; // Items added from store while in edit mode

  // Actions
  enterEditMode: (orderData: EditOrderData) => void;
  exitEditMode: () => void;
  addPendingItem: (item: Omit<OrderItem, 'id' | 'isNew'>) => void;
  updatePendingItemQuantity: (itemId: string, quantity: number) => void;
  removePendingItem: (itemId: string) => void;
  clearPendingItems: () => void;

  // For modal use
  updateOrderItem: (itemId: string, quantity: number) => void;
  deleteOrderItem: (itemId: string) => void;

  // Calculate totals
  getNewTotal: () => number;
  getPendingTotal: () => number;
}

const EditOrderContext = createContext<EditOrderContextType | undefined>(undefined);

export function EditOrderProvider({ children }: { children: React.ReactNode }) {
  const [isEditMode, setIsEditMode] = useState(false);
  const [editOrderData, setEditOrderData] = useState<EditOrderData | null>(null);
  const [pendingItems, setPendingItems] = useState<OrderItem[]>([]);

  // Enter edit mode with order data
  const enterEditMode = useCallback((orderData: EditOrderData) => {
    setIsEditMode(true);
    setEditOrderData({
      ...orderData,
      items: orderData.items.map(item => ({
        ...item,
        isNew: false,
        isDeleted: false,
        isModified: false
      }))
    });
    setPendingItems([]);
  }, []);

  // Exit edit mode and clear all data
  const exitEditMode = useCallback(() => {
    setIsEditMode(false);
    setEditOrderData(null);
    setPendingItems([]);
  }, []);

  // Add item from store to pending items
  const addPendingItem = useCallback((item: Omit<OrderItem, 'id' | 'isNew'>) => {
    setPendingItems(prev => {
      // Check if item already exists
      const existingIndex = prev.findIndex(i => i.product_id === item.product_id);

      if (existingIndex >= 0) {
        // Update quantity if exists
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: updated[existingIndex].quantity + item.quantity
        };
        return updated;
      }

      // Add new item
      return [...prev, {
        ...item,
        id: `pending-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        isNew: true
      }];
    });
  }, []);

  // Update pending item quantity
  const updatePendingItemQuantity = useCallback((itemId: string, quantity: number) => {
    if (quantity <= 0) {
      removePendingItem(itemId);
      return;
    }

    setPendingItems(prev =>
      prev.map(item =>
        item.id === itemId ? { ...item, quantity } : item
      )
    );
  }, []);

  // Remove pending item
  const removePendingItem = useCallback((itemId: string) => {
    setPendingItems(prev => prev.filter(item => item.id !== itemId));
  }, []);

  // Clear all pending items
  const clearPendingItems = useCallback(() => {
    setPendingItems([]);
  }, []);

  // Update existing order item quantity (in modal)
  const updateOrderItem = useCallback((itemId: string, quantity: number) => {
    if (!editOrderData) return;

    if (quantity <= 0) {
      deleteOrderItem(itemId);
      return;
    }

    setEditOrderData(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        items: prev.items.map(item =>
          item.id === itemId
            ? { ...item, quantity, isModified: true }
            : item
        )
      };
    });
  }, [editOrderData]);

  // Mark order item as deleted (in modal)
  const deleteOrderItem = useCallback((itemId: string) => {
    if (!editOrderData) return;

    setEditOrderData(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        items: prev.items.map(item =>
          item.id === itemId
            ? { ...item, isDeleted: true }
            : item
        )
      };
    });
  }, [editOrderData]);

  // Calculate new total for order items (excluding deleted)
  const getNewTotal = useCallback(() => {
    if (!editOrderData) return 0;

    return editOrderData.items
      .filter(item => !item.isDeleted)
      .reduce((sum, item) => sum + (item.price * item.quantity), 0);
  }, [editOrderData]);

  // Calculate total for pending items
  const getPendingTotal = useCallback(() => {
    return pendingItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  }, [pendingItems]);

  const value: EditOrderContextType = {
    isEditMode,
    editOrderData,
    pendingItems,
    enterEditMode,
    exitEditMode,
    addPendingItem,
    updatePendingItemQuantity,
    removePendingItem,
    clearPendingItems,
    updateOrderItem,
    deleteOrderItem,
    getNewTotal,
    getPendingTotal
  };

  return (
    <EditOrderContext.Provider value={value}>
      {children}
    </EditOrderContext.Provider>
  );
}

export function useEditOrder() {
  const context = useContext(EditOrderContext);
  if (context === undefined) {
    throw new Error('useEditOrder must be used within an EditOrderProvider');
  }
  return context;
}

export default EditOrderContext;
