"use client";

import React, { useState, useRef, useEffect } from "react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import JSZip from "jszip";
import RouteGuard from "@/components/RouteGuard";

const FONTS = [
  {
    id: "cormorant",
    name: "Cormorant Garamond (كلاسيك إنجليزي)",
    family: "'Cormorant Garamond', serif",
    url: "Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400;1,600;1,700",
  },
  {
    id: "cairo",
    name: "Cairo (خط كايرو)",
    family: "'Cairo', sans-serif",
    url: "Cairo:wght@400;600;700",
  },
  {
    id: "amiri",
    name: "Amiri (خط أميري)",
    family: "'Amiri', serif",
    url: "Amiri:ital,wght@0,400;0,600;0,700;1,400;1,600;1,700",
  },
  {
    id: "tajawal",
    name: "Tajawal (خط تجول)",
    family: "'Tajawal', sans-serif",
    url: "Tajawal:wght@400;500;700",
  },
  {
    id: "alexandria",
    name: "Alexandria (خط الإسكندرية)",
    family: "'Alexandria', sans-serif",
    url: "Alexandria:wght@400;600;700",
  },
  {
    id: "playfair",
    name: "Playfair Display (فخم إنجليزي)",
    family: "'Playfair Display', serif",
    url: "Playfair+Display:ital,wght@0,400;0,600;0,700;1,400;1,600;1,700",
  },
  {
    id: "inter",
    name: "Inter (حديث إنجليزي)",
    family: "'Inter', sans-serif",
    url: "Inter:wght@400;600;700",
  },
];

export default function CertificatesPage() {
  const [templateSrc, setTemplateSrc] = useState<string | null>(null);
  const [names, setNames] = useState<string[]>([]);
  const [position, setPosition] = useState({ x: 50, y: 50 });
  const [fontSize, setFontSize] = useState(48);
  const [selectedFontId, setSelectedFontId] = useState("cormorant");
  const [fontWeight, setFontWeight] = useState("600");
  const [fontStyle, setFontStyle] = useState("normal");

  const selectedFont = FONTS.find((f) => f.id === selectedFontId) || FONTS[0];

  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [imgNaturalSize, setImgNaturalSize] = useState({ width: 0, height: 0 });
  const [scale, setScale] = useState(1);

  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState("");
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  // Load the fonts needed by the canvas
  useEffect(() => {
    const link = document.createElement("link");
    const fontQuery = FONTS.map((f) => f.url).join("&family=");
    link.href = `https://fonts.googleapis.com/css2?family=${fontQuery}&display=swap`;
    link.rel = "stylesheet";
    document.head.appendChild(link);
    return () => {
      document.head.removeChild(link);
    };
  }, []);

  // Calculate the scale to render the preview font size exactly like the final PDF
  useEffect(() => {
    if (!containerRef.current || !imgNaturalSize.width) return;
    const observer = new ResizeObserver((entries) => {
      setScale(entries[0].contentRect.width / imgNaturalSize.width);
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [imgNaturalSize]);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

  const handleTemplateUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);

    const img = new Image();
    img.src = url;
    img.onload = () => {
      setImgNaturalSize({ width: img.naturalWidth, height: img.naturalHeight });
      setTemplateSrc(url);
    };
    img.onerror = () => showToast("تعذر قراءة الصورة.", "error");
  };

  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1 });

        // Extract first column, skip header, remove empty
        const extractedNames = data
          .slice(1)
          .map((row) => (row as unknown[])[0])
          .filter((name) => typeof name === "string" && name.trim().length > 0)
          .map((name) => (name as string).trim());

        setNames(extractedNames);
      } catch {
        showToast("تأكد من صيغة ملف الإكسل.", "error");
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent | TouchEvent) => {
      if (!containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      let clientX, clientY;

      if ("touches" in e) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else {
        clientX = e.clientX;
        clientY = e.clientY;
      }

      const x = Math.max(
        0,
        Math.min(100, ((clientX - rect.left) / rect.width) * 100),
      );
      const y = Math.max(
        0,
        Math.min(100, ((clientY - rect.top) / rect.height) * 100),
      );
      setPosition({ x, y });
    };

    const handleMouseUp = () => setIsDragging(false);

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("touchmove", handleMouseMove, { passive: false });
    window.addEventListener("touchend", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("touchmove", handleMouseMove);
      window.removeEventListener("touchend", handleMouseUp);
    };
  }, [isDragging]);

  const sanitizeFilename = (name: string) =>
    name.replace(/[^a-zA-Z0-9]/g, "_").replace(/_+/g, "_") + ".pdf";

  const generateCertificates = async () => {
    if (!templateSrc || names.length === 0) return;
    if (names.length > 500) {
      showToast("عذراً، الحد الأقصى هو 500 شهادة في المرة الواحدة.", "error");
      return;
    }

    await document.fonts.ready;
    setGenerating(true);
    const zip = new JSZip();

    try {
      const img = new Image();
      img.src = templateSrc;
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });

      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas not supported");

      for (let i = 0; i < names.length; i++) {
        const name = names[i];
        setProgress(`جاري توليد الشهادات... (${i + 1} / ${names.length})`);

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        // Render Text
        ctx.font = `${fontStyle} ${fontWeight} ${fontSize}px ${selectedFont.family}`;
        ctx.fillStyle = "#1a1a1a";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        const xPx = (position.x / 100) * canvas.width;
        const yPx = (position.y / 100) * canvas.height;
        ctx.fillText(name, xPx, yPx);

        const imgData = canvas.toDataURL("image/jpeg", 0.95);

        const pdf = new jsPDF({
          orientation: canvas.width > canvas.height ? "landscape" : "portrait",
          unit: "px",
          format: [canvas.width, canvas.height],
        });
        pdf.addImage(imgData, "JPEG", 0, 0, canvas.width, canvas.height);

        const pdfBlob = pdf.output("blob");
        zip.file(sanitizeFilename(name), pdfBlob);

        // Yield execution to the browser so the UI updates and doesn't freeze
        if (i % 5 === 0) await new Promise((r) => setTimeout(r, 0));
      }

      setProgress("جاري ضغط الملفات...");
      const zipBlob = await zip.generateAsync({ type: "blob" });

      const link = document.createElement("a");
      link.href = URL.createObjectURL(zipBlob);
      link.download = "certificates.zip";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      showToast(`تم توليد ${names.length} شهادة بنجاح!`, "success");
    } catch (error) {
      console.error(error);
      showToast("حدث خطأ أثناء توليد الشهادات.", "error");
    } finally {
      setGenerating(false);
      setProgress("");
    }
  };

  return (
    <RouteGuard allowedRoles={["admin", "employee"]}>
      <main className="flex-1 bg-transparent dark:bg-transparent text-gray-900 dark:text-gray-100 p-6 sm:p-12 font-sans w-full overflow-x-hidden">
        {/* Toast Notification */}
        {toast && (
          <div
            className={`fixed bottom-6 right-6 px-6 py-3 rounded-lg shadow-lg z-50 transition-all ${toast.type === "success" ? "bg-green-600 text-white" : "bg-red-600 text-white"}`}
          >
            {toast.message}
          </div>
        )}

        {/* Loading Overlay */}
        {generating && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 flex flex-col items-center gap-4 shadow-2xl">
              <svg
                className="animate-spin h-10 w-10 text-blue-600"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              <p className="text-lg font-bold text-gray-800 dark:text-gray-200">
                {progress}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                يرجى عدم إغلاق هذه الصفحة...
              </p>
            </div>
          </div>
        )}

        <div className="max-w-6xl mx-auto space-y-8">
          <header className="text-center space-y-3">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-blue-900 dark:text-blue-400 tracking-tight">
              مولد الشهادات التلقائي
            </h1>
            <p className="text-gray-500 dark:text-gray-400 text-lg">
              قم برفع قالب الشهادة وشيت الأسماء لتوليد جميع الشهادات بصيغة PDF
              بضغطة زر
            </p>
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Controls Column */}
            <div className="lg:col-span-1 space-y-6">
              {/* Template Upload */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6">
                <h2 className="font-bold text-gray-800 dark:text-gray-200 mb-4">
                  1. قالب الشهادة (صورة)
                </h2>
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 dark:border-gray-600 border-dashed rounded-xl cursor-pointer bg-transparent dark:bg-transparent hover:bg-gray-100 transition-colors">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <svg
                      className="w-8 h-8 text-gray-500 mb-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                    <p className="text-sm text-gray-700 dark:text-gray-200 font-bold">
                      اضغط لرفع الصورة (PNG/JPG)
                    </p>
                  </div>
                  <input
                    id="certificate-template-file"
                    name="certificateTemplateFile"
                    type="file"
                    className="hidden"
                    accept="image/png, image/jpeg"
                    onChange={handleTemplateUpload}
                  />
                </label>
              </div>

              {/* Excel Upload */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6">
                <h2 className="font-bold text-gray-800 dark:text-gray-200 mb-4">
                  2. شيت الأسماء (Excel)
                </h2>
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 dark:border-gray-600 border-dashed rounded-xl cursor-pointer bg-transparent dark:bg-transparent hover:bg-gray-100 transition-colors">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <svg
                      className="w-8 h-8 text-gray-500 mb-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    <p className="text-sm text-gray-700 dark:text-gray-200 font-bold">
                      اضغط لرفع شيت الإكسل
                    </p>
                  </div>
                  <input
                    id="certificate-names-file"
                    name="certificateNamesFile"
                    type="file"
                    className="hidden"
                    accept=".xlsx, .xls, .csv"
                    onChange={handleExcelUpload}
                  />
                </label>
                {names.length > 0 && (
                  <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-700 rounded-full text-sm font-semibold border border-green-200">
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    {names.length} اسم تم قراءتهم
                  </div>
                )}
              </div>

              {/* Adjustments */}
              {templateSrc && (
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6 space-y-4">
                  <h2 className="font-bold text-gray-800 dark:text-gray-200 mb-4">
                    3. إعدادات النص
                  </h2>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      <span>نوع الخط (Font Family)</span>
                    </label>
                    <select
                      id="certificate-font-family"
                      name="certificateFontFamily"
                      value={selectedFontId}
                      onChange={(e) => setSelectedFontId(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-gray-700 dark:text-gray-200 font-sans"
                    >
                      {FONTS.map((font) => (
                        <option
                          key={font.id}
                          value={font.id}
                          style={{ fontFamily: font.family }}
                        >
                          {font.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        <span>سمك الخط</span>
                      </label>
                      <select
                        id="certificate-font-weight"
                        name="certificateFontWeight"
                        value={fontWeight}
                        onChange={(e) => setFontWeight(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-gray-700 dark:text-gray-200"
                      >
                        <option value="400">عادي (400)</option>
                        <option value="500">متوسط (500)</option>
                        <option value="600">شبه عريض (600)</option>
                        <option value="700">عريض (700)</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        <span>نمط الخط</span>
                      </label>
                      <select
                        id="certificate-font-style"
                        name="certificateFontStyle"
                        value={fontStyle}
                        onChange={(e) => setFontStyle(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-gray-700 dark:text-gray-200"
                      >
                        <option value="normal">عادي (Normal)</option>
                        <option value="italic">مائل (Italic)</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 flex justify-between items-center">
                      <span>حجم الخط</span>
                      <div className="flex items-center gap-1.5">
                        <input
                          id="certificate-font-size-number"
                          name="certificateFontSizeNumber"
                          type="number"
                          min="12"
                          max="1500"
                          value={fontSize}
                          onChange={(e) =>
                            setFontSize(
                              Math.max(
                                12,
                                Math.min(1500, Number(e.target.value) || 12),
                              ),
                            )
                          }
                          className="w-16 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-lg text-center font-mono text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-gray-700 dark:text-gray-200"
                        />
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          px
                        </span>
                      </div>
                    </label>
                    <input
                      id="certificate-font-size"
                      name="certificateFontSize"
                      type="range"
                      min="12"
                      max="1500"
                      value={fontSize}
                      onChange={(e) => setFontSize(Number(e.target.value))}
                      className="w-full accent-blue-600"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        موضع أفقي %
                      </label>
                      <input
                        id="certificate-position-x"
                        name="certificatePositionX"
                        type="number"
                        step="0.1"
                        value={position.x.toFixed(1)}
                        onChange={(e) =>
                          setPosition({
                            ...position,
                            x: Number(e.target.value),
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-center font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        موضع رأسي %
                      </label>
                      <input
                        id="certificate-position-y"
                        name="certificatePositionY"
                        type="number"
                        step="0.1"
                        value={position.y.toFixed(1)}
                        onChange={(e) =>
                          setPosition({
                            ...position,
                            y: Number(e.target.value),
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-center font-mono"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Generate Button */}
              <button
                onClick={generateCertificates}
                disabled={!templateSrc || names.length === 0}
                className="w-full py-4 rounded-xl text-lg font-bold text-white shadow-lg transition-all duration-300 disabled:bg-gray-300 disabled:cursor-not-allowed bg-blue-600 hover:bg-blue-700 hover:scale-[1.02] flex items-center justify-center gap-2"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                  />
                </svg>
                توليد الشهادات (ZIP)
              </button>
            </div>

            {/* Preview Column */}
            <div className="lg:col-span-2">
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6 h-full flex flex-col">
                <h3 className="font-bold text-gray-800 dark:text-gray-200 mb-4 flex items-center justify-between">
                  <span>المعاينة المباشرة</span>
                  {templateSrc && (
                    <span className="text-xs font-normal bg-blue-50 text-blue-700 px-3 py-1.5 rounded-md border border-blue-100 flex items-center gap-1">
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"
                        />
                      </svg>
                      اسحب الاسم لتحديد المكان
                    </span>
                  )}
                </h3>

                <div className="flex-1 bg-transparent dark:bg-transparent rounded-xl flex items-center justify-center border-2 border-dashed border-gray-200 dark:border-gray-700 overflow-hidden relative p-2 sm:p-6 min-h-[400px]">
                  {templateSrc ? (
                    <div
                      ref={containerRef}
                      className="relative shadow-xl bg-white dark:bg-gray-800 select-none w-full max-w-full ring-1 ring-gray-900/5"
                      style={{
                        aspectRatio:
                          imgNaturalSize.width && imgNaturalSize.height
                            ? `${imgNaturalSize.width}/${imgNaturalSize.height}`
                            : "auto",
                      }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={templateSrc}
                        alt="Preview"
                        className="w-full h-full object-contain pointer-events-none"
                        draggable={false}
                      />

                      <div
                        onMouseDown={handleMouseDown}
                        onTouchStart={handleMouseDown}
                        className="absolute cursor-move px-6 py-2 rounded-lg border border-transparent hover:border-blue-400 hover:bg-blue-50/20 transition-colors"
                        style={{
                          left: `${position.x}%`,
                          top: `${position.y}%`,
                          transform: `translate(-50%, -50%)`,
                          fontFamily: selectedFont.family,
                          fontWeight: fontWeight,
                          fontStyle: fontStyle,
                          color: "#1a1a1a",
                          fontSize: `${fontSize * scale}px`,
                          whiteSpace: "nowrap",
                          lineHeight: 1,
                        }}
                      >
                        أحمد محمد / Ahmed Mohamed
                      </div>
                    </div>
                  ) : (
                    <div className="text-gray-400 text-center max-w-sm">
                      <svg
                        className="w-16 h-16 mx-auto mb-3 opacity-50"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                      <p className="text-gray-500 dark:text-gray-400">
                        قم برفع صورة القالب من القائمة الجانبية لتظهر المعاينة
                        هنا وتتمكن من تحديد مكان الاسم.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </RouteGuard>
  );
}
