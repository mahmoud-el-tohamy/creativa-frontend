"use client";

import React, { useState } from "react";
import useSWR from "swr";
import { getTracks, addTrack, removeTrack, Track } from "@/lib/tracks";

interface TrackSelectorProps {
  selectedTrack: string;
  onTrackChange: (trackName: string) => void;
  showToast: (message: string, type: "success" | "error") => void;
}

export default function TrackSelector({ selectedTrack, onTrackChange, showToast }: TrackSelectorProps) {
  const [isManageTracksModalOpen, setIsManageTracksModalOpen] = useState(false);
  const [newTrackName, setNewTrackName] = useState("");

  const { data: tracksData, mutate: mutateTracks, isLoading: loadingTracks } = useSWR("/api/tracks", getTracks, { revalidateOnFocus: false });
  const tracks = tracksData || [];

  return (
    <>
      <div className="flex items-center gap-4 w-full">
        <div className="relative w-full">
          <select
            value={selectedTrack}
            onChange={(e) => onTrackChange(e.target.value)}
            className="w-full appearance-none bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 py-4 px-6 pr-10 rounded-xl leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm transition-all font-semibold"
          >
            <option value="غير محدد">-- اختر التراك --</option>
            {tracks.map((t: Track) => (
              <option key={t.id} value={t.name}>{t.name}</option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
            <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
          </div>
        </div>
        
        <button
          type="button"
          onClick={() => setIsManageTracksModalOpen(true)}
          className="p-4 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition-colors shadow-sm"
          title="إدارة التراكات"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      </div>

      {isManageTracksModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl p-8 max-w-lg w-full border border-gray-100 dark:border-gray-700 flex flex-col max-h-[80vh]">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white">إدارة التراكات</h2>
              <button type="button" onClick={() => setIsManageTracksModalOpen(false)} className="text-gray-400 hover:text-red-500 transition-colors p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <div className="flex gap-2 mb-6">
              <input
                type="text"
                placeholder="اسم التراك الجديد..."
                value={newTrackName}
                onChange={(e) => setNewTrackName(e.target.value)}
                className="flex-1 px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newTrackName.trim()) {
                    e.preventDefault();
                    addTrack(newTrackName.trim()).then(() => {
                      mutateTracks();
                      setNewTrackName("");
                      showToast("تمت إضافة التراك بنجاح", "success");
                    }).catch(() => showToast("حدث خطأ أثناء الإضافة", "error"));
                  }
                }}
              />
              <button
                type="button"
                onClick={() => {
                  if (newTrackName.trim()) {
                    addTrack(newTrackName.trim()).then(() => {
                      mutateTracks();
                      setNewTrackName("");
                      showToast("تمت إضافة التراك بنجاح", "success");
                    }).catch(() => showToast("حدث خطأ أثناء الإضافة", "error"));
                  }
                }}
                disabled={!newTrackName.trim()}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold rounded-xl transition-colors"
              >
                إضافة
              </button>
            </div>

            <div className="overflow-y-auto flex-1 pr-2 space-y-3">
              {loadingTracks ? (
                <div className="text-center py-8 text-gray-500">جاري التحميل...</div>
              ) : tracks.length === 0 ? (
                <div className="text-center py-8 text-gray-500">لا توجد تراكات مسجلة</div>
              ) : (
                tracks.map((t: Track) => (
                  <div key={t.id} className="flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-700/30 border border-gray-100 dark:border-gray-700 rounded-xl group hover:border-blue-300 dark:hover:border-blue-700 transition-all">
                    <span className="font-semibold text-gray-800 dark:text-gray-200">{t.name}</span>
                    <button
                      type="button"
                      onClick={async () => {
                        if (confirm(`هل أنت متأكد من حذف ${t.name}؟`)) {
                          await removeTrack(t.id);
                          mutateTracks();
                          if (selectedTrack === t.name) onTrackChange("غير محدد");
                        }
                      }}
                      className="text-red-500 opacity-50 group-hover:opacity-100 hover:bg-red-50 dark:hover:bg-red-900/20 p-2 rounded-lg transition-all"
                      title="حذف"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
