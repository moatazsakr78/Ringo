"use client";

import { Fragment, useState, useEffect } from "react";
import { Dialog, Transition } from "@headlessui/react";
import {
  XMarkIcon,
  UserIcon,
  TruckIcon,
  ExclamationTriangleIcon,
  ArrowsRightLeftIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";
import {
  convertCustomerToSupplier,
  convertSupplierToCustomer,
  getCustomerWithBalance,
  getSupplierWithBalance,
} from "../lib/services/partyConversionService";

export type ConversionType = "customer-to-supplier" | "supplier-to-customer";

interface Party {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  city: string | null;
  address: string | null;
  account_balance: number | null;
}

interface ConvertPartyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConversionComplete?: (newId: string) => void;
  party: Party | null;
  conversionType: ConversionType;
}

export default function ConvertPartyModal({
  isOpen,
  onClose,
  onConversionComplete,
  party,
  conversionType,
}: ConvertPartyModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);
  const [balance, setBalance] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [newPartyId, setNewPartyId] = useState<string | null>(null);

  const isCustomerToSupplier = conversionType === "customer-to-supplier";

  // Reset state when modal opens/closes or party changes
  useEffect(() => {
    if (isOpen && party) {
      setError(null);
      setSuccess(false);
      setNewPartyId(null);
      fetchBalance();
    }
  }, [isOpen, party?.id]);

  // Fetch current balance
  const fetchBalance = async () => {
    if (!party) return;

    setIsLoadingBalance(true);
    try {
      if (isCustomerToSupplier) {
        const result = await getCustomerWithBalance(party.id);
        setBalance(result.balance);
      } else {
        const result = await getSupplierWithBalance(party.id);
        setBalance(result.balance);
      }
    } catch (err) {
      console.error("Error fetching balance:", err);
    } finally {
      setIsLoadingBalance(false);
    }
  };

  // Handle conversion
  const handleConvert = async () => {
    if (!party) return;

    setIsLoading(true);
    setError(null);

    try {
      let result;
      if (isCustomerToSupplier) {
        result = await convertCustomerToSupplier(party.id);
      } else {
        result = await convertSupplierToCustomer(party.id);
      }

      if (result.success && result.newId) {
        setSuccess(true);
        setNewPartyId(result.newId);

        // Wait a bit then notify parent and close
        setTimeout(() => {
          onConversionComplete?.(result.newId!);
          handleClose();
        }, 1500);
      } else {
        setError(result.error || "فشل في عملية التحويل");
      }
    } catch (err: any) {
      setError(err.message || "حدث خطأ غير متوقع");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setError(null);
      setSuccess(false);
      setNewPartyId(null);
      onClose();
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("ar-EG", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  if (!party) return null;

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={handleClose}>
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
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-[#1F2937] shadow-xl transition-all">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-700">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${
                      isCustomerToSupplier
                        ? "bg-blue-500/20 text-blue-400"
                        : "bg-green-500/20 text-green-400"
                    }`}>
                      <ArrowsRightLeftIcon className="h-5 w-5" />
                    </div>
                    <Dialog.Title className="text-lg font-medium text-white">
                      {isCustomerToSupplier ? "تحويل العميل لمورد" : "تحويل المورد لعميل"}
                    </Dialog.Title>
                  </div>
                  <button
                    onClick={handleClose}
                    disabled={isLoading}
                    className="text-gray-400 hover:text-white transition-colors disabled:opacity-50"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                  {/* Success State */}
                  {success ? (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircleIcon className="h-10 w-10 text-green-400" />
                      </div>
                      <h3 className="text-lg font-medium text-white mb-2">
                        تم التحويل بنجاح!
                      </h3>
                      <p className="text-gray-400 text-sm">
                        {isCustomerToSupplier
                          ? `تم تحويل "${party.name}" من عميل إلى مورد`
                          : `تم تحويل "${party.name}" من مورد إلى عميل`}
                      </p>
                    </div>
                  ) : (
                    <>
                      {/* Party Info Card */}
                      <div className="bg-[#2B3544] rounded-xl p-4">
                        <div className="flex items-center gap-4">
                          <div className={`w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold ${
                            isCustomerToSupplier
                              ? "bg-blue-500/30 text-blue-300"
                              : "bg-amber-500/30 text-amber-300"
                          }`}>
                            {party.name.substring(0, 2)}
                          </div>
                          <div className="flex-1">
                            <h3 className="text-white font-medium text-lg">{party.name}</h3>
                            {party.phone && (
                              <p className="text-gray-400 text-sm">{party.phone}</p>
                            )}
                            {party.city && (
                              <p className="text-gray-500 text-xs">{party.city}</p>
                            )}
                          </div>
                          <div className="text-left">
                            {isLoadingBalance ? (
                              <div className="animate-pulse bg-gray-600 h-6 w-20 rounded" />
                            ) : (
                              <div className={`text-lg font-medium ${
                                balance >= 0 ? "text-green-400" : "text-red-400"
                              }`}>
                                {formatCurrency(Math.abs(balance))} ج.م
                              </div>
                            )}
                            <p className="text-gray-500 text-xs">الرصيد الحالي</p>
                          </div>
                        </div>
                      </div>

                      {/* Conversion Direction */}
                      <div className="flex items-center justify-center gap-4 py-4">
                        <div className={`flex flex-col items-center gap-2 px-4 py-3 rounded-lg ${
                          isCustomerToSupplier
                            ? "bg-blue-500/10 border border-blue-500/30"
                            : "bg-amber-500/10 border border-amber-500/30"
                        }`}>
                          {isCustomerToSupplier ? (
                            <UserIcon className="h-8 w-8 text-blue-400" />
                          ) : (
                            <TruckIcon className="h-8 w-8 text-amber-400" />
                          )}
                          <span className="text-sm text-gray-300">
                            {isCustomerToSupplier ? "عميل" : "مورد"}
                          </span>
                        </div>

                        <ArrowsRightLeftIcon className="h-6 w-6 text-gray-500" />

                        <div className={`flex flex-col items-center gap-2 px-4 py-3 rounded-lg ${
                          isCustomerToSupplier
                            ? "bg-amber-500/10 border border-amber-500/30"
                            : "bg-blue-500/10 border border-blue-500/30"
                        }`}>
                          {isCustomerToSupplier ? (
                            <TruckIcon className="h-8 w-8 text-amber-400" />
                          ) : (
                            <UserIcon className="h-8 w-8 text-blue-400" />
                          )}
                          <span className="text-sm text-gray-300">
                            {isCustomerToSupplier ? "مورد" : "عميل"}
                          </span>
                        </div>
                      </div>

                      {/* Warning Note */}
                      <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
                        <div className="flex gap-3">
                          <ExclamationTriangleIcon className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" />
                          <div className="text-sm">
                            <p className="text-amber-200 font-medium mb-1">ملاحظة مهمة</p>
                            <ul className="text-gray-300 space-y-1 list-disc list-inside">
                              <li>
                                سيتم نقل "{party.name}" من {isCustomerToSupplier ? "صفحة العملاء" : "صفحة الموردين"} إلى {isCustomerToSupplier ? "صفحة الموردين" : "صفحة العملاء"}
                              </li>
                              <li>العمليات السابقة ستبقى مرتبطة بالسجل القديم</li>
                              <li>سيبدأ الحساب الجديد برصيد صفر</li>
                            </ul>
                          </div>
                        </div>
                      </div>

                      {/* Error Message */}
                      {error && (
                        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm">
                          {error}
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Footer */}
                {!success && (
                  <div className="flex gap-3 p-4 border-t border-gray-700">
                    <button
                      onClick={handleClose}
                      disabled={isLoading}
                      className="flex-1 px-4 py-2.5 rounded-lg bg-gray-600 hover:bg-gray-500 text-white font-medium transition-colors disabled:opacity-50"
                    >
                      إلغاء
                    </button>
                    <button
                      onClick={handleConvert}
                      disabled={isLoading}
                      className={`flex-1 px-4 py-2.5 rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2 ${
                        isCustomerToSupplier
                          ? "bg-amber-500 hover:bg-amber-600 text-white"
                          : "bg-blue-500 hover:bg-blue-600 text-white"
                      }`}
                    >
                      {isLoading ? (
                        <>
                          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                              fill="none"
                            />
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            />
                          </svg>
                          <span>جاري التحويل...</span>
                        </>
                      ) : (
                        <>
                          <ArrowsRightLeftIcon className="h-5 w-5" />
                          <span>تأكيد التحويل</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
