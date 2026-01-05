'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, rectSortingStrategy } from '@dnd-kit/sortable';
import { useSocialMedia, SocialMediaLink, CreateSocialMediaLink } from '@/lib/hooks/useSocialMedia';
import SocialMediaManagementGrid from '../store-design/components/SocialMediaManagementGrid';
import AddSocialMediaModal from '../store-design/components/AddSocialMediaModal';

export default function SocialMediaManagementPage() {
  const router = useRouter();
  const {
    links,
    settings,
    isLoading,
    error,
    createLink,
    updateLink,
    deleteLink,
    toggleActive,
    reorderLinks,
    updateSettings,
    fetchLinks
  } = useSocialMedia();

  const [isDragMode, setIsDragMode] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [selectedLinkId, setSelectedLinkId] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingLink, setEditingLink] = useState<SocialMediaLink | null>(null);
  const [localLinks, setLocalLinks] = useState<SocialMediaLink[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Set client-side flag
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Sync local links with fetched links
  useEffect(() => {
    if (links && !isSaving) {
      setLocalLinks([...links]);
      setHasUnsavedChanges(false);
    }
  }, [links, isSaving]);

  // Warn user when leaving with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = 'لديك تغييرات غير محفوظة. هل تريد المغادرة دون حفظ؟';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [hasUnsavedChanges]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setLocalLinks((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        const newItems = arrayMove(items, oldIndex, newIndex);
        setHasUnsavedChanges(true);
        return newItems;
      });
    }
  };

  const handleLinkSelect = (id: string) => {
    setSelectedLinkId(selectedLinkId === id ? null : id);
  };

  const handleToggleVisibility = async (id: string) => {
    await toggleActive(id);
  };

  const handleDelete = async (id: string) => {
    const link = localLinks.find(l => l.id === id);
    if (link && confirm(`هل أنت متأكد من حذف "${link.platform}"؟`)) {
      await deleteLink(id);
      setSelectedLinkId(null);
    }
  };

  const handleEdit = (link: SocialMediaLink) => {
    setEditingLink(link);
    setIsAddModalOpen(true);
  };

  const handleSaveLink = async (data: CreateSocialMediaLink) => {
    if (editingLink) {
      await updateLink(editingLink.id, data);
    } else {
      await createLink(data);
    }
    setEditingLink(null);
    setIsAddModalOpen(false);
  };

  const handleSaveOrder = async () => {
    if (!hasUnsavedChanges) {
      alert('لا توجد تغييرات للحفظ');
      return;
    }

    setIsSaving(true);
    try {
      await reorderLinks(localLinks);
      setHasUnsavedChanges(false);
      alert('تم حفظ الترتيب بنجاح!');
    } catch (err) {
      console.error('Error saving order:', err);
      alert('حدث خطأ أثناء حفظ الترتيب');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDiscardChanges = () => {
    if (confirm('هل أنت متأكد من إلغاء جميع التغييرات؟')) {
      setLocalLinks([...links]);
      setHasUnsavedChanges(false);
      setIsDragMode(false);
    }
  };

  const handleIconShapeChange = async (shape: 'square' | 'rounded') => {
    await updateSettings({ icon_shape: shape });
  };

  // Show loading state
  if (!isClient || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#c0c0c0' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600">جاري تحميل صفحة السوشيال ميديا...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col text-gray-800" style={{ backgroundColor: '#c0c0c0' }}>
      {/* Header */}
      <header className="flex-shrink-0 border-b border-gray-700 py-1" style={{ backgroundColor: 'var(--primary-color)' }}>
        <div className="w-full px-6 flex items-center justify-between">
          {/* Right side - Title and Action buttons */}
          <div className="flex items-center gap-1">
            <h1 className="text-2xl font-bold text-white">سوشيال ميديا</h1>

            <div className="w-px h-8 bg-white/30 mx-3"></div>

            {/* Drag Mode Button */}
            <button
              onClick={() => setIsDragMode(!isDragMode)}
              className={`flex flex-col items-center justify-center p-4 transition-colors group min-w-[100px] ${
                isDragMode ? 'hover:text-yellow-200' : 'hover:text-gray-200'
              }`}
            >
              <svg
                className={`w-8 h-8 mb-2 transition-colors ${
                  isDragMode ? 'text-yellow-300 group-hover:text-yellow-200' : 'text-white group-hover:text-gray-200'
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
              <span className={`text-sm font-bold text-center leading-tight transition-colors ${
                isDragMode ? 'text-yellow-300 group-hover:text-yellow-200' : 'text-white group-hover:text-gray-200'
              }`}>
                {isDragMode ? 'إلغاء تبديل' : 'تبديل المراكز'}
              </span>
            </button>

            <div className="w-px h-8 bg-white/30 mx-2"></div>

            {/* Add Button */}
            <button
              onClick={() => {
                setEditingLink(null);
                setIsAddModalOpen(true);
              }}
              className="flex flex-col items-center justify-center p-4 transition-colors group min-w-[100px] hover:bg-white/10"
            >
              <svg className="w-8 h-8 mb-2 text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
              <span className="text-sm font-bold text-center leading-tight text-white transition-colors">
                إضافة رابط
              </span>
            </button>

            {/* Save Order Button - appears when in drag mode */}
            {isDragMode && (
              <>
                <div className="w-px h-8 bg-white/30 mx-2"></div>
                <button
                  onClick={handleSaveOrder}
                  disabled={isSaving || !hasUnsavedChanges}
                  className={`flex flex-col items-center justify-center p-4 transition-colors group min-w-[100px] ${
                    hasUnsavedChanges ? 'hover:text-green-200' : 'opacity-50 cursor-not-allowed'
                  }`}
                >
                  <svg className="w-8 h-8 mb-2 text-green-300 group-hover:text-green-200 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-sm font-bold text-center leading-tight text-green-300 group-hover:text-green-200 transition-colors">
                    {isSaving ? 'جاري الحفظ' : 'حفظ الترتيب'}
                  </span>
                </button>
              </>
            )}
          </div>

          {/* Left side - Exit button */}
          <button
            onClick={() => router.back()}
            className="text-white hover:text-red-300 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex min-h-0">
        {/* Unsaved Changes Bar */}
        {hasUnsavedChanges && (
          <div className="fixed bottom-0 left-0 right-0 z-40 bg-amber-50 border-t-2 border-amber-200 px-6 py-3" style={{ marginRight: '320px' }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-amber-500 rounded-full animate-pulse"></div>
                <span className="text-amber-800 font-semibold">لديك تغييرات غير محفوظة</span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleDiscardChanges}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  disabled={isSaving}
                >
                  إلغاء التغييرات
                </button>
                <button
                  onClick={handleSaveOrder}
                  disabled={isSaving}
                  className="px-6 py-2 text-white font-semibold rounded-lg transition-colors flex items-center gap-2"
                  style={{ backgroundColor: 'var(--primary-color)' }}
                >
                  {isSaving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      جاري الحفظ...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      حفظ جميع التغييرات
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Sidebar */}
        <div className="flex-shrink-0 w-80 bg-white border-l border-gray-300 flex flex-col">
          <div className="flex-1 overflow-y-auto scrollbar-hide p-6">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">لوحة التحكم</h2>

              <div className="space-y-3">
                <button
                  onClick={() => {
                    setEditingLink(null);
                    setIsAddModalOpen(true);
                  }}
                  className="w-full flex items-center justify-between px-4 py-3 text-right rounded-lg transition-colors bg-red-100 border-2 border-red-300"
                >
                  <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span className="font-medium text-red-600">إضافة رابط جديد</span>
                </button>

                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-sm text-gray-600">
                    <p className="font-semibold mb-1">عدد الروابط:</p>
                    <p className="text-2xl font-bold text-gray-800">{localLinks.length}</p>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-sm text-gray-600">
                    <p className="font-semibold mb-1">الروابط النشطة:</p>
                    <p className="text-2xl font-bold text-green-600">{localLinks.filter(l => l.is_active).length}</p>
                  </div>
                </div>

                {/* Icon Shape Setting */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="font-semibold text-sm text-gray-600 mb-3">شكل الأيقونات:</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleIconShapeChange('square')}
                      className={`flex-1 py-2 px-3 rounded-lg border-2 transition-colors ${
                        settings?.icon_shape === 'square'
                          ? 'border-red-500 bg-red-50 text-red-700'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      <div className="w-6 h-6 bg-gray-300 rounded-lg mx-auto mb-1"></div>
                      <span className="text-xs">مربعة</span>
                    </button>
                    <button
                      onClick={() => handleIconShapeChange('rounded')}
                      className={`flex-1 py-2 px-3 rounded-lg border-2 transition-colors ${
                        settings?.icon_shape === 'rounded'
                          ? 'border-red-500 bg-red-50 text-red-700'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      <div className="w-6 h-6 bg-gray-300 rounded-full mx-auto mb-1"></div>
                      <span className="text-xs">دائرية</span>
                    </button>
                  </div>
                </div>

                {/* Preview Link */}
                <a
                  href="/social-media"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-between px-4 py-3 text-right rounded-lg transition-colors bg-blue-50 border-2 border-blue-200 hover:bg-blue-100"
                >
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  <span className="font-medium text-blue-600">معاينة الصفحة</span>
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto scrollbar-hide p-6">
            {isDragMode ? (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={localLinks.map(l => l.id)}
                  strategy={rectSortingStrategy}
                >
                  <SocialMediaManagementGrid
                    links={localLinks}
                    selectedLinkId={selectedLinkId}
                    isDragMode={isDragMode}
                    onLinkSelect={handleLinkSelect}
                    onToggleVisibility={handleToggleVisibility}
                    onDelete={handleDelete}
                    onEdit={handleEdit}
                  />
                </SortableContext>
              </DndContext>
            ) : (
              <SocialMediaManagementGrid
                links={localLinks}
                selectedLinkId={selectedLinkId}
                isDragMode={isDragMode}
                onLinkSelect={handleLinkSelect}
                onToggleVisibility={handleToggleVisibility}
                onDelete={handleDelete}
                onEdit={handleEdit}
              />
            )}
          </div>
        </main>
      </div>

      {/* Add/Edit Modal */}
      <AddSocialMediaModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingLink(null);
        }}
        onSave={handleSaveLink}
        editingLink={editingLink}
      />
    </div>
  );
}
