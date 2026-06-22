"use client";

import React, { useEffect, useState } from "react";
import { AdminSidebar } from "@/components/admin-sidebar";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, CheckCircle, FileText, Globe, Upload, AlertTriangle, ArrowRight, ShieldCheck } from "lucide-react";

interface Question {
  id: string;
}

interface TestSection {
  id: string;
  subject: string;
  duration: number;
  questions: Question[];
}

interface SeriesTest {
  id: string;
  title: string;
  duration: number;
  marksPerQ: number;
  negativeMarks: number;
  order: number;
  sections: TestSection[];
}

interface TestSeries {
  id: string;
  title: string;
  description: string;
  batch: string | string[];
  price: number;
  subjects: string | string[];
  isLive: boolean;
  tests: SeriesTest[];
}

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

export default function AddTestsHubPage({ params }: { params: { seriesId: string } }) {
  const seriesId = params.seriesId;
  const router = useRouter();

  const [series, setSeries] = useState<TestSeries | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [publishing, setPublishing] = useState(false);

  // Wizard state inside the page
  const [isCreating, setIsCreating] = useState(false);
  const [wizardStep, setWizardStep] = useState(1); // 1: setup, 2: sections hub, 3: configure section, 4: success
  
  // Step 1 wizard states
  const [testTitle, setTestTitle] = useState("");
  const [defaultMarksPerQ, setDefaultMarksPerQ] = useState("0.833");
  const [defaultNegativeMarks, setDefaultNegativeMarks] = useState("0.27489");
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [actualSubjects, setActualSubjects] = useState<string[]>([]);
  const [activeTestId, setActiveTestId] = useState("");

  // Step 2 & 3 states: tracking configured sections
  const [sectionsData, setSectionsData] = useState<Record<string, { duration: number; questionsCount: number }>>({});
  const [activeSubject, setActiveSubject] = useState<string | null>(null);

  // Step 3 states: Configuring one section
  const [sectionDuration, setSectionDuration] = useState("120");
  const [sectionMarksPerQ, setSectionMarksPerQ] = useState("0.833");
  const [sectionNegativeMarks, setSectionNegativeMarks] = useState("0.27489");
  const [uploaderType, setUploaderType] = useState<"pdf" | "excel">("pdf");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [extractedQuestions, setExtractedQuestions] = useState<ExtractedQuestion[]>([]);

  useEffect(() => {
    fetchSeriesDetails();
  }, [seriesId]);

  const fetchSeriesDetails = async () => {
    try {
      const res = await fetch(`/api/series/${seriesId}`);
      if (res.ok) {
        const data = await res.json();
        setSeries(data);
      } else {
        setError("Failed to fetch test series details.");
      }
    } catch (err) {
      setError("Network error. Failed to load details.");
    } finally {
      setLoading(false);
    }
  };

  const handlePublishSeries = async () => {
    if (!series || series.tests.length === 0) return;
    setPublishing(true);
    setError("");

    try {
      const res = await fetch(`/api/admin/test-series/${seriesId}/publish`, {
        method: "POST"
      });
      const data = await res.json();

      if (res.ok && data.success) {
        alert("🎉 Test Series is now LIVE!");
        router.push("/admin/test-series");
      } else {
        setError(data.error || "Failed to publish test series.");
      }
    } catch (err) {
      setError("Network issue. Failed to publish series.");
    } finally {
      setPublishing(false);
    }
  };

  // Step 1 submit: create Draft SeriesTest shell
  const handleStep1Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (selectedSubjects.length === 0) {
      setError("Please select at least one subject.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`/api/admin/test-series/${seriesId}/add-test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: testTitle,
          defaultMarksPerQ,
          defaultNegativeMarks
        })
      });

      const data = await res.json();
      if (res.ok && data.success && data.test) {
        setActiveTestId(data.test.id);
        setActualSubjects([...selectedSubjects]);
        setSectionsData({});
        setWizardStep(2);
      } else {
        setError(data.error || "Failed to create series test draft.");
      }
    } catch (err) {
      setError("Server connection issue. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const startConfiguringSection = (subject: string) => {
    setActiveSubject(subject);
    setSectionDuration("120");
    setSectionMarksPerQ(defaultMarksPerQ);
    setSectionNegativeMarks(defaultNegativeMarks);
    setExtractedQuestions([]);
    setPdfFile(null);
    setExcelFile(null);
    setUploadProgress(0);
    setError("");
    setWizardStep(3);
  };

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      setError("Please upload a PDF file only.");
      return;
    }

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

      // Reuse the PDF parser under "temp" testId since it's just parsing questions
      const res = await fetch(`/api/tests/temp/upload-pdf`, {
        method: "POST",
        body: formData
      });

      clearInterval(interval);
      setUploadProgress(100);

      const data = await res.json();
      if (res.ok && data.questions) {
        setExtractedQuestions(data.questions);
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
      setError("Please upload an Excel spreadsheet only (.xlsx, .xls, .csv).");
      return;
    }

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

      // Reuse the Excel parser under "temp" testId
      const res = await fetch(`/api/tests/temp/upload-excel`, {
        method: "POST",
        body: formData
      });

      clearInterval(interval);
      setUploadProgress(100);

      const data = await res.json();
      if (res.ok && data.questions) {
        setExtractedQuestions(data.questions);
      } else {
        setError(data.error || "Failed to parse Excel questions.");
        setExcelFile(null);
      }
    } catch (err) {
      clearInterval(interval);
      setError("Failed to process Excel spreadsheet upload.");
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

  const handleSaveSection = async () => {
    if (!activeSubject) return;

    const unansweredCount = extractedQuestions.filter((q) => q.correctOption === "").length;
    if (unansweredCount > 0) {
      setError("Please select correct answers for all questions before saving.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const res = await fetch(`/api/admin/test-series/${seriesId}/tests/${activeTestId}/sections/add`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: activeSubject,
          duration: sectionDuration,
          marksPerQ: sectionMarksPerQ,
          negativeMarks: sectionNegativeMarks,
          questions: extractedQuestions
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSectionsData((prev) => ({
          ...prev,
          [activeSubject]: {
            duration: parseInt(sectionDuration),
            questionsCount: extractedQuestions.length
          }
        }));
        setWizardStep(2);
        setActiveSubject(null);
      } else {
        setError(data.error || "Failed to save section.");
      }
    } catch (err) {
      setError("Server connection issue. Failed to save section.");
    } finally {
      setLoading(false);
    }
  };

  const handlePublishTest = async () => {
    setError("");
    setLoading(true);

    try {
      const res = await fetch(`/api/admin/test-series/${seriesId}/tests/${activeTestId}/publish`, {
        method: "POST"
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setWizardStep(4);
      } else {
        setError(data.error || "Failed to publish series test.");
      }
    } catch (err) {
      setError("Server connection issue. Failed to publish.");
    } finally {
      setLoading(false);
    }
  };

  const finishCreation = () => {
    setIsCreating(false);
    setWizardStep(1);
    setTestTitle("");
    setSelectedSubjects([]);
    setSectionsData({});
    fetchSeriesDetails();
  };

  const totalAddedSectionsCount = Object.keys(sectionsData).length;

  if (loading && !series) {
    return (
      <div className="flex h-screen overflow-hidden bg-[#F5F3EC] text-[#0D0F12]">
        <AdminSidebar />
        <main className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#C9A84C]"></div>
        </main>
      </div>
    );
  }

  if (!series) {
    return (
      <div className="flex h-screen overflow-hidden bg-[#F5F3EC] text-[#D94F3D]">
        <AdminSidebar />
        <main className="flex-1 p-8">
          <div className="p-4 bg-white border border-[#DDD8CC] rounded shadow-sm text-center">
            <h3 className="font-bold">Error: Series not found</h3>
          </div>
        </main>
      </div>
    );
  }

  const formatSubject = (sub: string) => {
    if (!sub) return "";
    const trimSub = sub.trim();
    const lower = trimSub.toLowerCase();
    if (lower === "general knowledge") return "GK";
    if (lower === "mathematics") return "Maths";
    return trimSub;
  };

  const seriesSubjectsList = (Array.isArray(series.subjects)
    ? series.subjects
    : typeof series.subjects === "string"
    ? series.subjects.split(",").map((s) => s.trim()).filter(Boolean)
    : []).map(formatSubject);

  return (
    <div className="flex h-screen overflow-hidden bg-[#F5F3EC] text-[#0D0F12]">
      <AdminSidebar />
      <main className="flex-1 p-8 overflow-y-auto">
        {!isCreating ? (
          /* SERIES TESTS LIST HUB VIEW */
          <div>
            {/* Top Header */}
            <div className="sticky top-0 z-20 bg-[#F5F3EC] -mx-8 px-8 pt-4 -mt-8 flex flex-col md:flex-row justify-between md:items-center gap-4 mb-8 border-b border-[#DDD8CC] pb-6">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => router.push("/admin/test-series")}
                  className="p-1.5 border border-[#DDD8CC] rounded-sm bg-white hover:bg-gray-50 transition"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div>
                  <h1 className="page-title text-[#0D0F12]">{series.title}</h1>
                  <p className="text-sm text-[#8B9E6A] font-body mt-1">
                    Manage mock tests inside this series (price: ₹{series.price})
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    setIsCreating(true);
                    setWizardStep(1);
                  }}
                  className="btn-primary flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" /> Create Test
                </button>
                <button
                  onClick={handlePublishSeries}
                  disabled={publishing || series.tests.length === 0}
                  className="bg-transparent border border-[#DDD8CC] hover:bg-white text-navy font-display font-bold uppercase text-xs tracking-wider px-5 py-2.5 shadow-sm rounded-sm transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Globe className="w-4 h-4 text-[#C9A84C]" />
                  {publishing ? "Publishing..." : "Submit & Publish Series"}
                </button>
              </div>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-[#D94F3D] rounded text-[#D94F3D] text-xs flex items-start gap-2 font-semibold">
                <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* List of existing tests */}
            <div className="bg-white rounded-[6px] border border-[#DDD8CC] shadow-sm p-6">
              <h2 className="section-title text-[#0D0F12] mb-6 uppercase">Tests in this Series</h2>
              {series.tests.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-500 font-semibold font-body">No tests created yet.</p>
                  <p className="text-xs text-gray-400 mt-1">Click the 'Create Test' button to get started.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {series.tests.map((test) => {
                    return (
                      <div
                        key={test.id}
                        className="flex flex-wrap justify-between items-center p-4 border border-[#DDD8CC] rounded-[6px] bg-[#F5F3EC]/35 hover:bg-gray-50 transition"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-[#C9A84C]/10 text-[#C9A84C] border border-[#C9A84C]/25 rounded flex items-center justify-center font-bold">
                            #{test.order}
                          </div>
                          <div>
                            <h4 className="font-display font-bold text-sm text-[#0D0F12] uppercase tracking-wide">
                              {test.title}
                            </h4>
                            <p className="text-xs text-[#8B9E6A] font-semibold mt-0.5">
                              {test.sections.length} subject sections • {test.duration} total minutes
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {test.sections.map((sec) => (
                            <span
                              key={sec.id}
                              className="bg-white border border-[#DDD8CC] text-[#8B9E6A] text-[9.5px] font-display font-bold uppercase tracking-wider px-2 py-1 rounded"
                            >
                              {formatSubject(sec.subject)} ({sec.questions.length} Q)
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* CREATE TEST WIZARD WIDGET */
          <div className="space-y-6">
            {/* Wizard Header */}
            <div className="sticky top-0 z-20 bg-[#F5F3EC] -mx-8 px-8 pt-4 -mt-8 flex justify-between items-center mb-6 border-b border-[#DDD8CC] pb-4">
              <div>
                <h2 className="section-title text-[#0D0F12] uppercase font-bold">
                  Create Series Test — Step {wizardStep} of 4
                </h2>
                <p className="text-xs text-[#8B9E6A] font-body mt-0.5">
                  Configure timing and upload section files for the new series exam sheet
                </p>
              </div>
              {wizardStep < 4 && (
                <button
                  onClick={finishCreation}
                  className="flex items-center gap-1.5 text-xs font-bold uppercase text-gray-500 hover:text-[#0D0F12]"
                >
                  <ArrowLeft className="w-4 h-4" /> Cancel Wizard
                </button>
              )}
            </div>

            {/* Steps Indicator */}
            <div className="flex items-center justify-between bg-white px-6 py-4 rounded-[6px] border border-[#DDD8CC] shadow-sm mb-6">
              {[
                { num: 1, name: "Test Details" },
                { num: 2, name: "Add Sections Hub" },
                { num: 3, name: "Configure Section" },
                { num: 4, name: "Publish" }
              ].map((s) => (
                <div key={s.num} className="flex items-center gap-2">
                  <span
                    className={`w-7 h-7 rounded-full flex items-center justify-center font-display text-sm font-bold transition duration-200 ${
                      wizardStep === s.num
                        ? "bg-[#C9A84C] text-[#0D0F12]"
                        : wizardStep > s.num
                        ? "bg-[#4A7C59] text-[#EEF0E8]"
                        : "bg-gray-100 text-gray-400"
                    }`}
                  >
                    {wizardStep > s.num ? "✓" : s.num}
                  </span>
                  <span
                    className={`font-display text-xs uppercase tracking-wider font-bold ${
                      wizardStep === s.num ? "text-[#0D0F12]" : "text-gray-400"
                    }`}
                  >
                    {s.name}
                  </span>
                  {s.num < 4 && <span className="text-gray-300 mx-4 md:mx-6 font-light">/</span>}
                </div>
              ))}
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-955/20 border border-[#D94F3D] rounded text-[#D94F3D] text-xs flex items-start gap-2 font-semibold">
                <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Wizard steps content */}
            <div
              className={`rounded-[6px] border shadow-sm p-8 ${
                wizardStep === 3 && extractedQuestions.length > 0
                  ? "bg-[#0D0F12] border-[#2E3B1E]"
                  : "bg-white border-[#DDD8CC]"
              }`}
            >
              {/* WIZARD STEP 1 */}
              {wizardStep === 1 && (
                <form onSubmit={handleStep1Submit} className="space-y-6 max-w-2xl">
                  <h3 className="font-display font-bold text-[#0D0F12] text-sm uppercase tracking-wide border-b pb-3 mb-4">
                    Step 1: Setup Series Test Details
                  </h3>

                  <div>
                    <label className="block text-xs font-display font-bold uppercase tracking-wider text-[#8B9E6A] mb-1.5">
                      Test Title
                    </label>
                    <input
                      type="text"
                      value={testTitle}
                      onChange={(e) => setTestTitle(e.target.value)}
                      placeholder="e.g. UPSC CDS Full Length Mock Test 1"
                      className="w-full px-3.5 py-2.5 border border-[#DDD8CC] rounded focus:outline-none focus:ring-1 focus:ring-[#C9A84C] text-sm font-semibold"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-xs font-display font-bold uppercase tracking-wider text-[#8B9E6A] mb-1.5">
                        Marks Per Correct Option
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={defaultMarksPerQ}
                        onChange={(e) => setDefaultMarksPerQ(e.target.value)}
                        className="w-full px-3.5 py-2.5 border border-[#DDD8CC] rounded focus:outline-none focus:ring-1 focus:ring-[#C9A84C] text-sm font-semibold"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-display font-bold uppercase tracking-wider text-[#8B9E6A] mb-1.5">
                        Negative Marking
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={defaultNegativeMarks}
                        onChange={(e) => setDefaultNegativeMarks(e.target.value)}
                        className="w-full px-3.5 py-2.5 border border-[#DDD8CC] rounded focus:outline-none focus:ring-1 focus:ring-[#C9A84C] text-sm font-semibold"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-display font-bold uppercase tracking-wider text-[#8B9E6A] mb-2.5">
                      Select subjects to include in this test
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {seriesSubjectsList.map((sub) => {
                        const isChecked = selectedSubjects.includes(sub);
                        return (
                          <label
                            key={sub}
                            className={`flex items-center gap-2.5 p-3 border rounded cursor-pointer transition select-none text-[10px] sm:text-xs font-bold uppercase tracking-wide ${
                              isChecked
                                ? "bg-[#2E3B1E]/10 border-[#C9A84C] text-[#C9A84C]"
                                : "bg-[#F5F3EC]/30 border-[#DDD8CC] hover:bg-gray-50 text-gray-700"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() =>
                                setSelectedSubjects((prev) =>
                                  prev.includes(sub) ? prev.filter((x) => x !== sub) : [...prev, sub]
                                )
                              }
                              className="w-4 h-4 accent-[#C9A84C]"
                            />
                            {sub}
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  <div className="pt-4 border-t flex justify-end">
                    <button type="submit" disabled={loading} className="btn-primary">
                      Next: Add Sections <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </form>
              )}

              {/* WIZARD STEP 2 */}
              {wizardStep === 2 && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center border-b pb-4 mb-6">
                    <h3 className="font-display font-bold text-[#0D0F12] text-sm uppercase tracking-wide">
                      Step 2: Add Sections Hub
                    </h3>
                    <button
                      onClick={handlePublishTest}
                      disabled={loading || totalAddedSectionsCount === 0}
                      className="btn-primary disabled:opacity-50"
                    >
                      {loading ? "Publishing..." : "Publish Test →"}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {actualSubjects.map((subject) => {
                      const section = sectionsData[subject];
                      const isAdded = !!section;

                      return (
                        <div
                          key={subject}
                          className={`p-6 rounded-[6px] border flex flex-col justify-between min-h-[160px] transition duration-200 ${
                            isAdded
                              ? "bg-white border-[#4A7C59] shadow-sm relative overflow-hidden"
                              : "bg-white border-[#DDD8CC] shadow-sm hover:border-[#C9A84C]"
                          }`}
                        >
                          {isAdded && (
                            <div className="absolute top-0 right-0 bg-[#4A7C59] text-white px-2.5 py-0.5 text-[10px] font-bold uppercase rounded-bl-sm">
                              Added ✓
                            </div>
                          )}
                          <div>
                            <h3 className="font-display font-bold text-lg text-navy uppercase tracking-wide">
                              {subject}
                            </h3>
                            <p className="text-xs text-[#8B9E6A] font-semibold mt-1">
                              {isAdded
                                ? `Section contains ${section.questionsCount} questions (${section.duration} min)`
                                : "Section status: Not Added"}
                            </p>
                          </div>

                          <div className="mt-6 flex justify-end">
                            {isAdded ? (
                              <button
                                onClick={() => startConfiguringSection(subject)}
                                className="text-xs font-bold uppercase text-[#C9A84C] hover:underline"
                              >
                                Reconfigure Section
                              </button>
                            ) : (
                              <button
                                onClick={() => startConfiguringSection(subject)}
                                className="bg-[#C9A84C] hover:bg-[#BCA147] text-white px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-sm transition shadow-sm"
                              >
                                + Add Section
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* WIZARD STEP 3 */}
              {wizardStep === 3 && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center border-b pb-4 mb-6">
                    <h3 className="font-display font-bold text-navy text-sm uppercase tracking-wide">
                      Step 3: Configure Section — {activeSubject}
                    </h3>
                    <button
                      onClick={() => setWizardStep(2)}
                      className="text-xs font-bold uppercase text-gray-500 hover:text-[#0D0F12]"
                    >
                      Cancel Section
                    </button>
                  </div>

                  {/* Top configuration inputs */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl">
                    <div>
                      <label className="block text-xs font-display font-bold uppercase tracking-wider text-[#8B9E6A] mb-1.5">
                        Section Duration (minutes)
                      </label>
                      <input
                        type="number"
                        value={sectionDuration}
                        onChange={(e) => setSectionDuration(e.target.value)}
                        min="1"
                        className="w-full px-3.5 py-2.5 border border-[#DDD8CC] rounded focus:outline-none focus:ring-1 focus:ring-[#C9A84C] text-sm font-semibold bg-white"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-display font-bold uppercase tracking-wider text-[#8B9E6A] mb-1.5">
                        Section Marks Per Q
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={sectionMarksPerQ}
                        onChange={(e) => setSectionMarksPerQ(e.target.value)}
                        className="w-full px-3.5 py-2.5 border border-[#DDD8CC] rounded focus:outline-none focus:ring-1 focus:ring-[#C9A84C] text-sm font-semibold bg-white"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-display font-bold uppercase tracking-wider text-[#8B9E6A] mb-1.5">
                        Section Negative Marks
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={sectionNegativeMarks}
                        onChange={(e) => setSectionNegativeMarks(e.target.value)}
                        className="w-full px-3.5 py-2.5 border border-[#DDD8CC] rounded focus:outline-none focus:ring-1 focus:ring-[#C9A84C] text-sm font-semibold bg-white"
                        required
                      />
                    </div>
                  </div>

                  {extractedQuestions.length === 0 ? (
                    <div className="max-w-2xl mx-auto py-8">
                      {/* Uploader Tabs */}
                      <div className="flex border-b border-[#DDD8CC] mb-8 font-display font-bold uppercase tracking-wider text-xs justify-center">
                        <button
                          onClick={() => setUploaderType("pdf")}
                          className={`px-8 py-3 text-center border-b-2 transition ${
                            uploaderType === "pdf"
                              ? "border-[#C9A84C] text-[#C9A84C]"
                              : "border-transparent text-[#8B9E6A] hover:text-[#0D0F12]"
                          }`}
                        >
                          PDF Document
                        </button>
                        <button
                          onClick={() => setUploaderType("excel")}
                          className={`px-8 py-3 text-center border-b-2 transition ${
                            uploaderType === "excel"
                              ? "border-[#C9A84C] text-[#C9A84C]"
                              : "border-transparent text-[#8B9E6A] hover:text-[#0D0F12]"
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
                          <h3 className="font-display font-bold text-lg text-navy mb-1 uppercase tracking-wider">
                            Drag & drop question paper PDF here
                          </h3>
                          <p className="text-xs text-[#8B9E6A] mb-2 font-body font-semibold">
                            Accepts .pdf files only
                          </p>
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
                          <h3 className="font-display font-bold text-lg text-navy mb-1 uppercase tracking-wider">
                            Drag & drop Excel spreadsheet here
                          </h3>
                          <p className="text-xs text-[#8B9E6A] mb-2 font-body font-semibold">
                            Accepts .xlsx, .xls, .csv files only
                          </p>
                        </div>
                      )}

                      {loading && (
                        <div className="mt-8">
                          <div className="flex justify-between items-center mb-1 text-xs text-[#8B9E6A] font-bold uppercase tracking-wider">
                            <span>Extracting questions...</span>
                            <span className="font-mono">{uploadProgress}%</span>
                          </div>
                          <div className="w-full bg-gray-150 h-2 rounded-full overflow-hidden">
                            <div
                              className="bg-[#C9A84C] h-full transition-all duration-300"
                              style={{ width: `${uploadProgress}%` }}
                            ></div>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Verify correct keys selection list */
                    <div className="space-y-6">
                      <div className="sticky top-[72px] bg-[#0D0F12] border-b border-[#2E3B1E] py-4 z-10 flex justify-between items-center">
                        <div>
                          <h3 className="text-[#EEF0E8] font-display text-sm font-bold uppercase tracking-wider">
                            Verify Correct Keys for {activeSubject}
                          </h3>
                          <span className="text-[10px] text-[#8B9E6A] font-semibold mt-1 block">
                            Marked: {extractedQuestions.filter((q) => q.correctOption !== "").length} /{" "}
                            {extractedQuestions.length}
                          </span>
                        </div>
                        <button onClick={handleSaveSection} disabled={loading} className="btn-primary">
                          {loading ? "Saving..." : "Save Section"}
                        </button>
                      </div>

                      <div className="space-y-5">
                        {extractedQuestions.map((q, index) => {
                          const isUnanswered = q.correctOption === "";

                          return (
                            <div
                              key={index}
                              className={`p-6 rounded border transition duration-150 ${
                                isUnanswered
                                  ? "border-l-4 border-l-[#D94F3D] border-[#2E3B1E] bg-[#1C2415]"
                                  : "border-[#2E3B1E] bg-[#1C2415]"
                              }`}
                            >
                              <h3 className="font-display font-bold text-[#EEF0E8] text-sm mb-4 flex items-start gap-2.5">
                                <span className="bg-[#C9A84C] text-[#0D0F12] px-2 py-0.5 rounded-sm text-xs font-mono font-bold mt-0.5">
                                  {q.order}
                                </span>
                                <span className="leading-relaxed">{q.questionText}</span>
                              </h3>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                                {(["A", "B", "C", "D"] as const).map((opt) => {
                                  const optionKey = `option${opt}` as keyof ExtractedQuestion;
                                  const optionText = q[optionKey] as string;
                                  const isSelected = q.correctOption === opt;

                                  return (
                                    <button
                                      key={opt}
                                      onClick={() => handleCorrectOptionSelect(index, opt)}
                                      className={`flex items-start text-left gap-3 px-4 py-3 rounded border text-xs transition duration-150 ${
                                        isSelected
                                          ? "bg-[#2E3B1E] text-[#F0D080] border-[#C9A84C] font-semibold"
                                          : "bg-[#1C2415] hover:bg-[#2E3B1E]/50 text-[#EEF0E8] border-[#2E3B1E]"
                                      }`}
                                    >
                                      <span
                                        className={`w-[18px] h-[18px] rounded-full border flex items-center justify-center text-[10px] font-extrabold flex-shrink-0 mt-0.5 ${
                                          isSelected
                                            ? "bg-[#C9A84C] border-[#C9A84C] text-[#0D0F12]"
                                            : "border-[#8B9E6A] bg-[#0D0F12] text-[#8B9E6A]"
                                        }`}
                                      >
                                        {opt}
                                      </span>
                                      <span className="leading-relaxed font-body font-medium">{optionText}</span>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* WIZARD STEP 4 */}
              {wizardStep === 4 && (
                <div className="text-center py-12 max-w-md mx-auto">
                  <div className="w-16 h-16 bg-[#4A7C59]/10 text-[#4A7C59] border border-[#4A7C59]/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <ShieldCheck className="w-10 h-10" />
                  </div>
                  <h3 className="font-display font-bold text-2xl uppercase tracking-wider text-[#0D0F12] mb-2">
                    🎉 Test Created!
                  </h3>
                  <p className="text-xs text-gray-500 font-body leading-relaxed mb-6 font-semibold">
                    The series mock test has been successfully added to this bundle.
                  </p>
                  <button onClick={finishCreation} className="btn-primary">
                    Return to Test Series
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
