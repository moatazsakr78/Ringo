"use client";

import { Fragment, useState, useEffect } from "react";
import { Dialog, Transition } from "@headlessui/react";
import {
  XMarkIcon,
  BuildingOfficeIcon,
  MapPinIcon,
  PhoneIcon,
} from "@heroicons/react/24/outline";
import { supabase } from "../lib/supabase/client";

interface Branch {
  id: string;
  name: string;
  address: string;
  phone: string;
  is_active: boolean | null;
  manager_id?: string | null;
}

interface BranchSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectBranch?: (branch: Branch) => void;
}

export default function BranchSelectionModal({
  isOpen,
  onClose,
  onSelectBranch,
}: BranchSelectionModalProps) {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch branches from database
  const fetchBranches = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from("branches")
        .select("*")
        .eq("is_active", true)
        .order("name", { ascending: true });

      if (error) {
        console.error("Error fetching branches:", error);
        setError("فشل في تحميل الفروع");
        return;
      }

      setBranches(data || []);
    } catch (error) {
      console.error("Error fetching branches:", error);
      setError("حدث خطأ أثناء تحميل الفروع");
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch branches when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchBranches();
    }
  }, [isOpen]);

  const handleSelect = (branch: Branch) => {
    if (onSelectBranch) {
      onSelectBranch(branch);
    }
    onClose();
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-[#1F2937] p-6 shadow-xl transition-all border border-gray-600">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <Dialog.Title className="text-xl font-bold text-white flex items-center gap-2">
                    <BuildingOfficeIcon className="h-6 w-6 text-blue-400" />
                    اختيار فرع البيع
                  </Dialog.Title>
                  <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-gray-700"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>

                {/* Branches List */}
                <div className="space-y-2 max-h-[400px] overflow-y-auto scrollbar-hide">
                  {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-12">
                      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500 mb-4"></div>
                      <p className="text-gray-400">جاري تحميل الفروع...</p>
                    </div>
                  ) : error ? (
                    <div className="flex flex-col items-center justify-center py-12">
                      <BuildingOfficeIcon className="h-12 w-12 text-red-500 mb-4" />
                      <p className="text-red-400 mb-2">{error}</p>
                      <button
                        onClick={fetchBranches}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors"
                      >
                        إعادة المحاولة
                      </button>
                    </div>
                  ) : branches.length > 0 ? (
                    branches.map((branch) => (
                      <button
                        key={branch.id}
                        onClick={() => handleSelect(branch)}
                        className="w-full flex items-center justify-between p-4 rounded-xl transition-all bg-[#2B3544] text-gray-200 border-2 border-transparent hover:bg-[#374151] hover:border-gray-500"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-[#374151] flex items-center justify-center">
                            <BuildingOfficeIcon className="h-5 w-5" />
                          </div>
                          <div className="text-right">
                            <div className="font-semibold">{branch.name}</div>
                            {branch.address && (
                              <div className="text-sm text-gray-400 flex items-center gap-1">
                                <MapPinIcon className="h-3.5 w-3.5" />
                                {branch.address}
                              </div>
                            )}
                          </div>
                        </div>
                        {branch.phone && (
                          <div className="text-sm text-gray-400 flex items-center gap-1">
                            <PhoneIcon className="h-4 w-4" />
                            {branch.phone}
                          </div>
                        )}
                      </button>
                    ))
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12">
                      <BuildingOfficeIcon className="h-12 w-12 text-gray-500 mb-4" />
                      <p className="text-gray-400 mb-2">لا توجد فروع نشطة</p>
                      <p className="text-gray-500 text-sm">
                        لا توجد فروع متاحة في قاعدة البيانات
                      </p>
                    </div>
                  )}
                </div>

                {/* Footer Note */}
                <div className="mt-6 p-3 bg-[#2B3544] rounded-lg">
                  <p className="text-sm text-gray-400 text-center">
                    اضغط على الفرع لاختياره للبيع منه
                  </p>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
