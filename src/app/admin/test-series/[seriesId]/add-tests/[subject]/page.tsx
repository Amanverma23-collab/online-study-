"use client";

import React, { useState, useEffect } from "react";
import { AdminSidebar } from "@/components/admin-sidebar";
import { useRouter } from "next/navigation";
import { Upload, CheckCircle, AlertTriangle, FileText, ArrowLeft, ArrowRight, ShieldCheck, Check } from "lucide-react";

interface ExtractedQuestion {
  order: number;
  questionText: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctOption: string; // "A" | "B" | "C" | "D" | ""
  explanation?: string;
}

export default function AddSubjectTestPage({ params }: { params: { seriesId: string; subject: string } }) {
  const { seriesId, subject: encodedSubject } = params;
  const subject = decodeURIComponent(encodedSubject);
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Step 1: Test Details
  const [title, setTitle] = useState("");
  const [duration, setDuration] = useState("120");
  const [marksPerQ, setMarksPerQ] = useState("0.833");
  const [negativeMarks, setNegativeMarks] = useState("0.27489");

  // Step 2: Upload Files
  const [uploaderType, setUploaderType] = useState<"pdf" | "excel">("pdf");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [extractedQuestions, setExtractedQuestions] = useState<ExtractedQuestion[]>([]);
  const [sessionKey, setSessionKey] = useState("");

  // Initialize unique session key, handle refresh restoration, and clear stale items
  useEffect(() => {
    let currentSessionKey = sessionStorage.getItem("current_test_session_key");
    if (!currentSessionKey || !currentSessionKey.includes(`paid_${seriesId}_${subject.replace(/\s+/g, "_")}`)) {
      const timestamp = Date.now();
      currentSessionKey = `extractedQuestions_paid_${seriesId}_${subject.replace(/\s+/g, "_")}_${timestamp}`;
      sessionStorage.setItem("current_test_session_key", currentSessionKey);
      
      // Reset state on a new session creation
      setExtractedQuestions([]);
      setPdfFile(null);
      setExcelFile(null);
      setUploadProgress(0);
      setError("");

      // Clear any older stale caches
      Object.keys(localStorage).forEach((k) => {
        if (k.startsWith("extractedQuestions")) localStorage.removeItem(k);
      });
      Object.keys(sessionStorage).forEach((k) => {
        if (k.startsWith("extractedQuestions") && k !== "current_test_session_key") {
          sessionStorage.removeItem(k);
        }
      });
    } else {
      // If it exists (e.g., refresh in the same wizard flow), restore from localStorage
      const cached = localStorage.getItem(currentSessionKey);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (parsed && Array.isArray(parsed) && parsed.length > 0) {
            setExtractedQuestions(parsed);
            setStep(3);
          }
        } catch (e) {
          setExtractedQuestions([]);
        }
      }
    }
    setSessionKey(currentSessionKey);
  }, [seriesId, subject]);

  // Sync questions with localStorage for refresh protection
  useEffect(() => {
    if (sessionKey && extractedQuestions.length > 0) {
      localStorage.setItem(sessionKey, JSON.stringify(extractedQuestions));
    }
  }, [extractedQuestions, sessionKey]);

  // Clean up if step falls back to 1 or 2 manually
  useEffect(() => {
    if (step === 1 || step === 2) {
      setExtractedQuestions([]);
      setPdfFile(null);
      setExcelFile(null);
      setUploadProgress(0);
      setError("");
      if (sessionKey) {
        localStorage.removeItem(sessionKey);
      }
    }
  }, [step, sessionKey]);

  useEffect(() => {
    // Auto-suggest title based on existing count
    fetchCount();
  }, [seriesId, subject]);

  const fetchCount = async () => {
    try {
      const res = await fetch(`/api/series/${seriesId}`);
      if (res.ok) {
        const seriesData = await res.json();
        const existingCount = (seriesData.tests || []).filter(
          (t: any) => t.subject.toLowerCase() === subject.toLowerCase()
        ).length;
        setTitle(`${subject} - Test ${existingCount + 1}`);
      }
    } catch (err) {
      console.error("Count fetch failed:", err);
    }
  };

  const handleStep1Submit = (e: React.FormEvent) => {
    e.preventDefault();
    setStep(2);
  };

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      setError("Please upload a PDF file only.");
      return;
    }

    // Explicitly reset and clear state and cache before upload to prevent stale data leak
    setExtractedQuestions([]);
    if (sessionKey) {
      localStorage.removeItem(sessionKey);
    }
    Object.keys(localStorage).forEach((k) => {
      if (k.startsWith("extractedQuestions")) localStorage.removeItem(k);
    });
    Object.keys(sessionStorage).forEach((k) => {
      if (k.startsWith("extractedQuestions") && k !== "current_test_session_key") {
        sessionStorage.removeItem(k);
      }
    });

    setPdfFile(file);
    setError("");
    setLoading(true);
    setUploadProgress(10);

    const interval = setInterval(() => {
      setUploadProgress((p) => (p < 80 ? p + 15 : p));
    }, 400);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`/api/tests/temp/upload-pdf`, {
        method: "POST",
        body: formData
      });

      clearInterval(interval);
      setUploadProgress(100);

      const data = await res.json();
      if (res.ok && data.questions) {
        setExtractedQuestions(data.questions);
        setTimeout(() => setStep(3), 1000);
      } else {
        setError(data.error || "Failed to parse PDF questions.");
        setPdfFile(null);
      }
    } catch (err) {
      clearInterval(interval);
      setError("Failed to process file upload.");
      setPdfFile(null);
    } finally {
      setLoading(false);
    }
  };

  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileExt = file.name.split(".").pop()?.toLowerCase();
    if (!["xlsx", "xls", "csv"].includes(fileExt || "")) {
      setError("Please upload an Excel spreadsheet file only (.xlsx, .xls, .csv).");
      return;
    }

    // Explicitly reset and clear state and cache before upload to prevent stale data leak
    setExtractedQuestions([]);
    if (sessionKey) {
      localStorage.removeItem(sessionKey);
    }
    Object.keys(localStorage).forEach((k) => {
      if (k.startsWith("extractedQuestions")) localStorage.removeItem(k);
    });
    Object.keys(sessionStorage).forEach((k) => {
      if (k.startsWith("extractedQuestions") && k !== "current_test_session_key") {
        sessionStorage.removeItem(k);
      }
    });

    setExcelFile(file);
    setError("");
    setLoading(true);
    setUploadProgress(15);

    const interval = setInterval(() => {
      setUploadProgress((p) => (p < 85 ? p + 20 : p));
    }, 300);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`/api/tests/temp/upload-excel`, {
        method: "POST",
        body: formData
      });

      clearInterval(interval);
      setUploadProgress(100);

      const data = await res.json();
      if (res.ok && data.questions) {
        setExtractedQuestions(data.questions);
        setTimeout(() => setStep(3), 1000);
      } else {
        setError(data.error || "Failed to parse Excel questions.");
        setExcelFile(null);
      }
    } catch (err) {
      clearInterval(interval);
      setError("Failed to process Excel file upload.");
      setExcelFile(null);
    } finally {
      setLoading(false);
    }
  };

  const handleCorrectOptionSelect = (index: number, option: "A" | "B" | "C" | "D") => {
    setExtractedQuestions((prev) =>
      prev.map((q, idx) => (idx === index ? { ...q, correctOption: option } : q))
    );
  };

  const markedCount = extractedQuestions.filter((q) => q.correctOption !== "").length;
  const isAllMarked = markedCount === extractedQuestions.length;

  const handleSaveTest = async () => {
    if (!isAllMarked) {
      setError("Please answer all questions before saving.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const res = await fetch(`/api/admin/test-series/${seriesId}/add-test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject,
          title,
          duration: parseInt(duration),
          marksPerQ: parseFloat(marksPerQ),
          negativeMarks: parseFloat(negativeMarks),
          questions: extractedQuestions
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setStep(4);
        if (sessionKey) {
          localStorage.removeItem(sessionKey);
        }
        sessionStorage.removeItem("current_test_session_key");
      } else {
        setError(data.error || "Failed to save test to series.");
      }
    } catch (err) {
      setError("Server connection issue. Failed to save.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[#F5F3EC] text-[#0D0F12]">
      <AdminSidebar />
      <main className="flex-1 p-8 overflow-y-auto">
        {/* Top Header */}
        <div className="sticky top-0 z-20 bg-[#F5F3EC] -mx-8 px-8 pt-4 -mt-8 flex items-center gap-3 mb-8 border-b border-[#DDD8CC] pb-6">
          <button
            onClick={() => router.push(`/admin/test-series/${seriesId}/add-tests`)}
            className="p-1.5 border border-[#DDD8CC] rounded-sm bg-white hover:bg-gray-50 transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="page-title text-[#0D0F12]">Add test for {subject}</h1>
            <p className="text-sm text-[#8B9E6A] font-body mt-1">Configure parameters and upload questions list</p>
          </div>
        </div>

        {/* Steps Breadcrumbs Indicator */}
        <div className="flex items-center justify-between bg-white px-6 py-4 rounded-[6px] border border-[#DDD8CC] shadow-sm mb-8">
          {[
            { num: 1, name: "Test Details" },
            { num: 2, name: "Upload File" },
            { num: 3, name: "Answer Key" },
            { num: 4, name: "Success" }
          ].map((s) => (
            <div key={s.num} className="flex items-center gap-2">
              <span
                className={`w-7 h-7 rounded-full flex items-center justify-center font-display text-sm font-bold transition duration-200 ${
                  step === s.num
                    ? "bg-[#C9A84C] text-[#0D0F12]"
                    : step > s.num
                    ? "bg-[#4A7C59] text-[#EEF0E8]"
                    : "bg-gray-100 text-gray-400"
                }`}
              >
                {step > s.num ? "✓" : s.num}
              </span>
              <span
                className={`font-display text-xs uppercase tracking-wider font-bold ${
                  step === s.num ? "text-[#0D0F12]" : "text-gray-400"
                }`}
              >
                {s.name}
              </span>
              {s.num < 4 && <span className="text-gray-300 mx-4 md:mx-6 font-light">/</span>}
            </div>
          ))}
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-[#D94F3D] rounded text-[#D94F3D] text-xs flex items-start gap-2 font-semibold">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Step Content Card */}
        <div className={`rounded-[6px] border shadow-sm p-8 ${step === 3 ? "bg-[#0D0F12] border-[#2E3B1E]" : "bg-white border-[#DDD8CC]"}`}>
          {/* STEP 1: Test Details Form */}
          {step === 1 && (
            <form onSubmit={handleStep1Submit} className="space-y-6 max-w-2xl">
              <h2 className="section-title text-[#0D0F12] border-b pb-3 mb-4 uppercase">Test Parameters</h2>
              
              <div>
                <label className="block text-xs font-display font-bold uppercase tracking-wider text-[#8B9E6A] mb-1.5">Test Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Mathematics - Mock Test 1"
                  className="w-full px-3.5 py-2.5 border border-[#DDD8CC] rounded focus:outline-none text-sm font-semibold"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-xs font-display font-bold uppercase tracking-wider text-[#8B9E6A] mb-1.5">Duration (minutes)</label>
                  <input
                    type="number"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    placeholder="120"
                    min="1"
                    className="w-full px-3.5 py-2.5 border border-[#DDD8CC] rounded focus:outline-none text-sm font-semibold"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-display font-bold uppercase tracking-wider text-[#8B9E6A] mb-1.5">Marks Per Correct Q</label>
                  <input
                    type="number"
                    step="any"
                    value={marksPerQ}
                    onChange={(e) => setMarksPerQ(e.target.value)}
                    placeholder="0.833"
                    className="w-full px-3.5 py-2.5 border border-[#DDD8CC] rounded focus:outline-none text-sm font-semibold"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-display font-bold uppercase tracking-wider text-[#8B9E6A] mb-1.5">Negative Marking</label>
                  <input
                    type="number"
                    step="any"
                    value={negativeMarks}
                    onChange={(e) => setNegativeMarks(e.target.value)}
                    placeholder="0.27489"
                    className="w-full px-3.5 py-2.5 border border-[#DDD8CC] rounded focus:outline-none text-sm font-semibold"
                    required
                  />
                </div>
              </div>

              <div className="pt-4 border-t flex justify-end">
                <button type="submit" className="btn-primary">
                  Next: Upload MCQ File <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          )}

          {/* STEP 2: File Upload (PDF/Excel) */}
          {step === 2 && (
            <div className="max-w-2xl mx-auto py-8">
              <h2 className="section-title text-[#0D0F12] border-b pb-3 mb-6 text-center uppercase">Upload questions document</h2>

              <div className="flex border-b border-[#DDD8CC] mb-8 font-display font-bold uppercase tracking-wider text-xs justify-center">
                <button
                  onClick={() => { setUploaderType("pdf"); setError(""); }}
                  disabled={loading}
                  className={`px-8 py-3 text-center border-b-2 transition ${
                    uploaderType === "pdf" ? "border-[#C9A84C] text-[#C9A84C]" : "border-transparent text-[#8B9E6A] hover:text-[#0D0F12]"
                  }`}
                >
                  PDF Document
                </button>
                <button
                  onClick={() => { setUploaderType("excel"); setError(""); }}
                  disabled={loading}
                  className={`px-8 py-3 text-center border-b-2 transition ${
                    uploaderType === "excel" ? "border-[#C9A84C] text-[#C9A84C]" : "border-transparent text-[#8B9E6A] hover:text-[#0D0F12]"
                  }`}
                >
                  Excel Spreadsheet
                </button>
              </div>

              {uploaderType === "pdf" ? (
                <div className="border border-dashed border-[#DDD8CC] rounded-[6px] p-12 text-center bg-[#F5F3EC]/50 flex flex-col items-center justify-center hover:bg-[#F5F3EC] cursor-pointer relative transition duration-150 group">
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={handlePdfUpload}
                    disabled={loading}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="p-4 bg-white border border-[#DDD8CC] rounded-full shadow-inner mb-4 group-hover:scale-105 transition duration-150">
                    <Upload className="w-8 h-8 text-[#C9A84C]" />
                  </div>
                  <h3 className="font-display font-bold text-lg text-navy mb-1 uppercase tracking-wider">Drag & drop question paper PDF here</h3>
                  <p className="text-xs text-[#8B9E6A] mb-2 font-body font-semibold">Accepts .pdf files only (Answers and explanations will be auto-marked)</p>
                  {pdfFile && (
                    <div className="mt-4 p-2.5 bg-[#C9A84C]/10 border border-[#C9A84C]/25 rounded flex items-center gap-2 text-[#C9A84C] font-display font-bold text-xs uppercase">
                      <FileText className="w-4 h-4" />
                      <span>{pdfFile.name}</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="border border-dashed border-[#DDD8CC] rounded-[6px] p-12 text-center bg-[#F5F3EC]/50 flex flex-col items-center justify-center hover:bg-[#F5F3EC] cursor-pointer relative transition duration-150 group">
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleExcelUpload}
                    disabled={loading}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="p-4 bg-white border border-[#DDD8CC] rounded-full shadow-inner mb-4 group-hover:scale-105 transition duration-150">
                    <Upload className="w-8 h-8 text-[#C9A84C]" />
                  </div>
                  <h3 className="font-display font-bold text-lg text-navy mb-1 uppercase tracking-wider">Drag & drop Excel spreadsheet here</h3>
                  <p className="text-xs text-[#8B9E6A] mb-2 font-body font-semibold">Accepts .xlsx, .xls, .csv files only</p>
                  {excelFile && (
                    <div className="mt-4 p-2.5 bg-[#C9A84C]/10 border border-[#C9A84C]/25 rounded flex items-center gap-2 text-[#C9A84C] font-display font-bold text-xs uppercase">
                      <FileText className="w-4 h-4" />
                      <span>{excelFile.name}</span>
                    </div>
                  )}
                </div>
              )}

              {loading && (
                <div className="mt-8">
                  <div className="flex justify-between items-center mb-1 text-xs text-[#8B9E6A] font-bold uppercase">
                    <span>{uploaderType === "pdf" ? "Extracting questions from PDF..." : "Extracting questions from Excel spreadsheet..."}</span>
                    <span className="font-mono">{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-gray-150 h-2 rounded-full overflow-hidden">
                    <div className="bg-[#C9A84C] h-full transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 3: Verification marking sheet */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="sticky top-[72px] bg-[#0D0F12] border-b border-[#2E3B1E] py-4 z-10 flex flex-wrap justify-between items-center gap-4">
                <div>
                  <h2 className="section-title text-[#EEF0E8] uppercase">Mark Correct Answers</h2>
                  <p className="text-xs text-[#8B9E6A] font-semibold mt-0.5">Please review correct keys and explanations. Modify as required.</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="bg-[#1C2415] border border-[#2E3B1E] text-[#C9A84C] font-display font-bold px-4 py-2 text-xs">
                    Marked: {markedCount} / {extractedQuestions.length}
                  </div>
                  <button onClick={handleSaveTest} disabled={loading || !isAllMarked} className="btn-primary">
                    {loading ? "Saving..." : "Save Test to Series →"}
                  </button>
                </div>
              </div>

              <div className="space-y-6 pt-4">
                {extractedQuestions.map((q, index) => {
                  const isUnanswered = q.correctOption === "";

                  return (
                    <div key={index} className={`p-6 rounded border ${isUnanswered ? "border-l-4 border-l-[#D94F3D] border-[#2E3B1E] bg-[#1C2415]" : "border-[#2E3B1E] bg-[#1C2415]"}`}>
                      <h3 className="font-display font-bold text-[#EEF0E8] text-md mb-4 flex items-start gap-2.5">
                        <span className="bg-[#C9A84C] text-[#0D0F12] px-2 py-0.5 rounded-sm text-xs mt-0.5 font-bold font-mono">{q.order}</span>
                        <span className="text-[#EEF0E8] leading-relaxed">{q.questionText}</span>
                      </h3>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {(["A", "B", "C", "D"] as const).map((opt) => {
                          const optionText = q[`option${opt}` as keyof ExtractedQuestion] as string;
                          const isSelected = q.correctOption === opt;

                          return (
                            <button
                              key={opt}
                              onClick={() => handleCorrectOptionSelect(index, opt)}
                              className={`flex items-start text-left gap-3 px-4 py-3 rounded border text-sm transition duration-150 ${
                                isSelected ? "bg-[#2E3B1E] text-[#F0D080] border-[#C9A84C] font-semibold" : "bg-[#1C2415] hover:bg-[#2E3B1E]/50 text-[#EEF0E8] border-[#2E3B1E]"
                              }`}
                            >
                              <span className={`w-5 h-5 rounded-full border flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5 ${
                                isSelected ? "bg-[#C9A84C] border-[#C9A84C] text-[#0D0F12]" : "border-[#8B9E6A] bg-[#0D0F12] text-[#8B9E6A]"
                              }`}>
                                {opt}
                              </span>
                              <span className="font-body text-xs font-medium leading-relaxed">{optionText}</span>
                            </button>
                          );
                        })}
                      </div>

                      {q.explanation && (
                        <div className="mt-4 p-3.5 bg-[#2E3B1E]/30 border border-[#2E3B1E] rounded text-xs text-[#EEF0E8]/85 font-body leading-relaxed">
                          <span className="font-display font-bold text-[#C9A84C] uppercase tracking-wider block mb-1">Parsed Explanation:</span>
                          {q.explanation}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 4: Success confirmation */}
          {step === 4 && (
            <div className="text-center py-12 max-w-md mx-auto">
              <div className="w-16 h-16 bg-[#4A7C59]/10 text-[#4A7C59] border border-[#4A7C59]/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-10 h-10" />
              </div>
              <h2 className="font-display font-bold text-2xl uppercase tracking-wider text-[#0D0F12] mb-2">Test Saved!</h2>
              <p className="text-xs text-gray-500 font-body leading-relaxed mb-6 font-semibold">
                This mock test has been successfully registered under the subject "{subject}" and slotted into the lock sequence.
              </p>
              <button onClick={() => router.push(`/admin/test-series/${seriesId}/add-tests`)} className="btn-primary">
                Return to Series Hub
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
