import React, { useState, useMemo } from "react";

interface Attendee {
  name: string;
  nationalId: string;
  notes?: string;
  attendedDays?: number;
}

interface ReviewWarningsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (selectedNationalIds: string[]) => void;
  targetedAttendees: Attendee[];
  bulkCheckResults: Record<string, { status: string; warningsCount: number }>;
  isProcessing: boolean;
}

export default function ReviewWarningsModal({
  isOpen,
  onClose,
  onConfirm,
  targetedAttendees,
  bulkCheckResults,
  isProcessing,
}: ReviewWarningsModalProps) {
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
  const [prevTargetedAttendees, setPrevTargetedAttendees] = useState(targetedAttendees);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());

  if (isOpen !== prevIsOpen || targetedAttendees !== prevTargetedAttendees) {
    setPrevIsOpen(isOpen);
    setPrevTargetedAttendees(targetedAttendees);
    if (isOpen) {
      setSelectedIds(new Set(targetedAttendees.map((a) => a.nationalId)));
    }
  }

  const handleToggleAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(targetedAttendees.map((a) => a.nationalId)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleToggleOne = (nationalId: string, checked: boolean) => {
    const newSet = new Set(selectedIds);
    if (checked) {
      newSet.add(nationalId);
    } else {
      newSet.delete(nationalId);
    }
    setSelectedIds(newSet);
  };

  const attendeesWithStatus = useMemo(() => {
    return targetedAttendees.map((attendee) => {
      const statusData = bulkCheckResults[attendee.nationalId] || { status: "none", warningsCount: 0 };
      const currentWarnings = statusData.status === "warning" ? statusData.warningsCount : 0;
      
      let consequenceText = "الإنذار الأول";
      let consequenceColor = "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
      
      if (statusData.status === "blacklisted") {
         consequenceText = "تم إضافته للبلاك ليست مسبقاً (سيتم تحديثه)";
         consequenceColor = "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
      } else if (currentWarnings === 1) {
        consequenceText = "الإنذار الثاني";
        consequenceColor = "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400";
      } else if (currentWarnings >= 2) {
        consequenceText = "بلاك ليست";
        consequenceColor = "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
      }

      return {
        ...attendee,
        currentWarnings,
        status: statusData.status,
        consequenceText,
        consequenceColor,
      };
    });
  }, [targetedAttendees, bulkCheckResults]);

  if (!isOpen) return null;

  const allSelected = selectedIds.size === targetedAttendees.length && targetedAttendees.length > 0;
  const someSelected = selectedIds.size > 0 && selectedIds.size < targetedAttendees.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6" dir="rtl">
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
        onClick={!isProcessing ? onClose : undefined} 
      />
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col relative z-10 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-6 sm:p-8 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">مراجعة وتأكيد الإنذارات</h2>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              الرجاء مراجعة قائمة المتدربين المستهدفين وتأكيد الإجراء المناسب.
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors disabled:opacity-50"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 sm:p-8 overflow-y-auto flex-1 custom-scrollbar">
          <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
            <table className="w-full text-sm text-right text-gray-600 dark:text-gray-300">
              <thead className="bg-gray-50 dark:bg-gray-900/50 text-gray-700 dark:text-gray-300 font-semibold border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="px-6 py-4 w-12">
                    <input
                      type="checkbox"
                      className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:checked:bg-blue-500 cursor-pointer"
                      checked={allSelected}
                      ref={(input) => {
                        if (input) input.indeterminate = someSelected;
                      }}
                      onChange={(e) => handleToggleAll(e.target.checked)}
                      disabled={isProcessing}
                    />
                  </th>
                  <th className="px-6 py-4">الاسم</th>
                  <th className="px-6 py-4">الرقم القومي</th>
                  <th className="px-6 py-4 text-center">الحالة الحالية</th>
                  <th className="px-6 py-4 text-center">الإجراء المتوقع</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {attendeesWithStatus.map((attendee) => {
                  const isSelected = selectedIds.has(attendee.nationalId);
                  return (
                    <tr 
                      key={attendee.nationalId} 
                      className={`hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer ${!isSelected ? 'opacity-60 bg-gray-50/50 dark:bg-gray-900/20' : ''}`}
                      onClick={() => !isProcessing && handleToggleOne(attendee.nationalId, !isSelected)}
                    >
                      <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:checked:bg-blue-500 cursor-pointer"
                          checked={isSelected}
                          onChange={(e) => handleToggleOne(attendee.nationalId, e.target.checked)}
                          disabled={isProcessing}
                        />
                      </td>
                      <td className="px-6 py-4 font-medium text-gray-900 dark:text-gray-100">
                        {attendee.name}
                      </td>
                      <td className="px-6 py-4 font-mono text-xs sm:text-sm">
                        {attendee.nationalId}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {attendee.status === "blacklisted" ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                            بلاك ليست
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                            {attendee.currentWarnings} إنذار
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${attendee.consequenceColor}`}>
                          {attendee.consequenceText}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {attendeesWithStatus.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                      لا يوجد متدربين مستهدفين بالإنذار.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 sm:p-8 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80 rounded-b-2xl flex flex-col sm:flex-row items-center justify-between shrink-0 gap-4">
          <div className="text-sm font-medium text-gray-600 dark:text-gray-300">
            تم تحديد <span className="text-blue-600 dark:text-blue-400 font-bold">{selectedIds.size}</span> من أصل <span className="font-bold">{targetedAttendees.length}</span> متدرب.
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={onClose}
              disabled={isProcessing}
              className="flex-1 sm:flex-none px-6 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 font-bold rounded-xl transition-colors disabled:opacity-50 text-sm"
            >
              إلغاء
            </button>
            <button
              onClick={() => onConfirm(Array.from(selectedIds))}
              disabled={isProcessing || selectedIds.size === 0}
              className="flex-1 sm:flex-none px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
            >
              {isProcessing ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  جاري التأكيد...
                </>
              ) : (
                "تأكيد وتطبيق الإنذارات"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
