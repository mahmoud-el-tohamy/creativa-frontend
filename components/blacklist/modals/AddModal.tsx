import React, { useState } from "react";
import TrackSelector from "@/components/shared/TrackSelector";

interface AddModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (name: string, nationalId: string, trackName?: string) => Promise<void>;
  isSubmitting: boolean;
}

export default function AddModal({ isOpen, onClose, onSubmit, isSubmitting }: AddModalProps) {
  const [newName, setNewName] = useState("");
  const [newNationalId, setNewNationalId] = useState("");
  const [trackName, setTrackName] = useState("غير محدد");
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(newName, newNationalId, trackName);
    if (!isSubmitting) {
      setNewName("");
      setNewNationalId("");
      setTrackName("");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-4 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-lg shadow-lg z-[150] transition-all ${toast.type === "success" ? "bg-green-600 text-white" : "bg-red-600 text-white"}`}>
          {toast.message}
        </div>
      )}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden transform transition-all">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-transparent dark:bg-transparent">
          <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200">إضافة شخص للبلاك ليست</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label htmlFor="blacklist-new-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الاسم الرباعي</label>
            <input
              id="blacklist-new-name"
              name="blacklistNewName"
              type="text"
              required
              aria-label="الاسم الرباعي"
              pattern="^[\u0600-\u06FFa-zA-Z\s]+$"
              value={newName}
              onKeyDown={(e) => { if (/[0-9]/.test(e.key)) e.preventDefault(); }}
              onChange={(e) => setNewName(e.target.value.replace(/[^a-zA-Z\u0600-\u06FF\s]/g, ''))}
              className="w-full px-4 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors placeholder-gray-400 dark:placeholder-gray-400"
              placeholder="أدخل الاسم..."
            />
          </div>
          <div>
            <label htmlFor="blacklist-new-national-id" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الرقم القومي</label>
            <input
              id="blacklist-new-national-id"
              name="blacklistNewNationalId"
              type="text"
              required
              aria-label="الرقم القومي"
              pattern="^[23]\d{13}$"
              maxLength={14}
              minLength={14}
              value={newNationalId}
              onKeyDown={(e) => { if (!/[0-9]/.test(e.key) && !['Backspace', 'Tab', 'ArrowLeft', 'ArrowRight', 'Delete', 'Enter'].includes(e.key)) e.preventDefault(); }}
              onChange={(e) => setNewNationalId(e.target.value.replace(/\D/g, ''))}
              className="w-full px-4 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors placeholder-gray-400 dark:placeholder-gray-400"
              placeholder="أدخل 14 رقماً..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">اسم التراك</label>
            <TrackSelector 
              selectedTrack={trackName} 
              onTrackChange={setTrackName} 
              showToast={showToast} 
            />
          </div>
          <div className="pt-4 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg font-medium transition-colors"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={isSubmitting || newName.length < 3 || newNationalId.length !== 14}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex justify-center items-center"
            >
              {isSubmitting ? (
                <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                "حفظ وإضافة"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
