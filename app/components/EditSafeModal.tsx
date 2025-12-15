'use client'

import { useState, useEffect } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { supabase } from '../lib/supabase/client'

interface EditSafeModalProps {
  isOpen: boolean
  onClose: () => void
  onSafeUpdated: () => void
  safe: any
}

export default function EditSafeModal({ isOpen, onClose, onSafeUpdated, safe }: EditSafeModalProps) {
  const [safeName, setSafeName] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (safe) {
      setSafeName(safe.name || '')
    }
  }, [safe])

  const handleSave = async () => {
    if (!safeName.trim() || !safe?.id) return

    setIsLoading(true)
    try {
      const { error } = await supabase
        .from('records')
        .update({
          name: safeName.trim(),
          updated_at: new Date().toISOString()
        })
        .eq('id', safe.id)

      if (error) {
        console.error('Error updating safe:', error)
        return
      }

      onSafeUpdated()
      onClose()
    } catch (error) {
      console.error('Error updating safe:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    setSafeName(safe?.name || '')
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" dir="rtl">
      <div className="bg-pos-darker rounded-lg p-6 w-96 max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">تعديل الخزنة</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Form */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              اسم الخزنة
            </label>
            <input
              type="text"
              value={safeName}
              onChange={(e) => setSafeName(e.target.value)}
              placeholder="أدخل اسم الخزنة..."
              className="w-full bg-gray-700 text-white placeholder-gray-400 px-4 py-2 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isLoading}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 mt-6">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-gray-300 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
            disabled={isLoading}
          >
            إلغاء
          </button>
          <button
            onClick={handleSave}
            disabled={!safeName.trim() || isLoading || safeName === safe?.name}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'جاري الحفظ...' : 'حفظ التغييرات'}
          </button>
        </div>
      </div>
    </div>
  )
}
