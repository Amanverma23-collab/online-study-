"use client";

import React, { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { User, Info, BookOpen, ChevronLeft, ChevronRight, Check, X, Clock } from "lucide-react";

interface Question {
  id: string;
  order: number;
  questionText: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
}

interface SectionDetails {
  id: string;
  subject: string;
  order: number;
  duration: number;
  marksPerQ: number;
  negativeMarks: number;
}

interface SectionTab {
  id: string;
  subject: string;
  order: number;
  duration: number;
  isCompleted: boolean;
}

interface QuestionState {
  selected: string | null; // "A"|"B"|"C"|"D"|null
  isMarked: boolean;
  isVisited: boolean;
}

export default function StudentTestInterface({ params }: { params: { testId: string } }) {
  const router = useRouter();
  const testId = params.testId;

  const [studentId, setStudentId] = useState<string | null>(null);
  const [studentName, setStudentName] = useState("");
  const [attemptId, setAttemptId] = useState("");

  const [testTitle, setTestTitle] = useState("");
  const [currentSection, setCurrentSection] = useState<SectionDetails | null>(null);
  const [allSections, setAllSections] = useState<SectionTab[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  const [qStates, setQStates] = useState<Record<string, QuestionState>>({});
  const [timeLeft, setTimeLeft] = useState(0); 
  const [questionTime, setQuestionTime] = useState(0); 
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showPalette, setShowPalette] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const questionTimerRef = useRef<NodeJS.Timeout | null>(null);
  const autoSubmitTriggeredRef = useRef(false);

  useEffect(() => {
    const sId = localStorage.getItem("studentId");
    const sName = localStorage.getItem("studentName");

    if (!sId || !sName) {
      router.push("/");
      return;
    }

    setStudentId(sId);
    setStudentName(sName);
    initializeAttempt(sId);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (questionTimerRef.current) clearInterval(questionTimerRef.current);
    };
  }, [testId]);

  const initializeAttempt = async (sId: string) => {
    try {
      // 1. Start or resume attempt
      const startRes = await fetch("/api/attempts/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId: sId, testId })
      });
      const startData = await startRes.json();

      if (!startRes.ok || !startData.attempt) {
        alert(startData.error || "Failed to initialize test attempt.");
        router.push("/student/dashboard");
        return;
      }

      const attempt = startData.attempt;
      setAttemptId(attempt.id);

      // 2. Load the current section's questions and details
      await loadSectionDetails(attempt.id);
    } catch (err) {
      console.error("Initialization error:", err);
      router.push("/student/dashboard");
    }
  };

  const loadSectionDetails = async (attId: string) => {
    try {
      setLoading(true);
      setErrorState(null);

      const sectionRes = await fetch(`/api/attempts/${attId}/current-section`);
      const sectionData = await sectionRes.json();

      if (!sectionRes.ok) {
        alert(sectionData.error || "Failed to load section details.");
        router.push("/student/dashboard");
        return;
      }

      if (sectionData.finished) {
        router.push(sectionData.redirectTo);
        return;
      }

      setTestTitle(sectionData.testTitle);
      setCurrentSection(sectionData.section);
      setAllSections(sectionData.allSections || []);
      setQuestions(sectionData.questions || []);
      setCurrentIndex(0);

      // Initialize question states
      const loadedAnswers = sectionData.answers || [];
      const initialStates: Record<string, QuestionState> = {};
      sectionData.questions.forEach((q: Question) => {
        const prevAns = loadedAnswers.find((ans: any) => ans.questionId === q.id);
        initialStates[q.id] = {
          selected: prevAns?.selected || null,
          isMarked: prevAns?.isMarked || false,
          isVisited: prevAns?.isVisited || false
        };
      });

      if (sectionData.questions[0]) {
        initialStates[sectionData.questions[0].id].isVisited = true;
      }

      setQStates(initialStates);
      setTimeLeft(sectionData.remainingTime);
      autoSubmitTriggeredRef.current = false;
      setLoading(false);
    } catch (err) {
      console.error("Failed to load section:", err);
      router.push("/student/dashboard");
    }
  };

  const [errorState, setErrorState] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;

    if (timeLeft <= 0) {
      triggerAutoSubmit();
      return;
    }

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          triggerAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [loading, timeLeft]);

  useEffect(() => {
    if (loading) return;

    setQuestionTime(0);
    if (questionTimerRef.current) clearInterval(questionTimerRef.current);

    questionTimerRef.current = setInterval(() => {
      setQuestionTime((prev) => prev + 1);
    }, 1000);

    return () => {
      if (questionTimerRef.current) clearInterval(questionTimerRef.current);
    };
  }, [currentIndex, loading]);

  const triggerAutoSubmit = async () => {
    if (autoSubmitTriggeredRef.current) return;
    autoSubmitTriggeredRef.current = true;
    
    setSubmitting(true);

    try {
      const payloadAnswers = questions.map((q) => ({
        questionId: q.id,
        selected: qStates[q.id]?.selected || null,
        isMarked: qStates[q.id]?.isMarked || false,
        isVisited: qStates[q.id]?.isVisited || false
      }));

      const res = await fetch(`/api/attempts/${attemptId}/submit-section`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sectionId: currentSection?.id, answers: payloadAnswers })
      });

      const data = await res.json();
      if (res.ok) {
        if (data.finished) {
          router.push(data.redirectTo);
        } else {
          // Alert and load next section
          alert(`${currentSection?.subject} section time expired. Moving to next section.`);
          await loadSectionDetails(attemptId);
        }
      } else {
        router.push("/student/dashboard");
      }
    } catch (err) {
      console.error("Auto submit failed:", err);
      router.push("/student/dashboard");
    } finally {
      setSubmitting(false);
    }
  };

  const handleManualSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);

    try {
      const payloadAnswers = questions.map((q) => ({
        questionId: q.id,
        selected: qStates[q.id]?.selected || null,
        isMarked: qStates[q.id]?.isMarked || false,
        isVisited: qStates[q.id]?.isVisited || false
      }));

      const res = await fetch(`/api/attempts/${attemptId}/submit-section`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sectionId: currentSection?.id, answers: payloadAnswers })
      });

      const data = await res.json();
      if (res.ok) {
        setShowSubmitModal(false);
        if (data.finished) {
          router.push(data.redirectTo);
        } else {
          alert(`${currentSection?.subject} section submitted. Starting next section.`);
          await loadSectionDetails(attemptId);
        }
      } else {
        alert(data.error || "Failed to submit section. Please try again.");
      }
    } catch (err) {
      console.error("Manual submit failure:", err);
      alert("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !currentSection || questions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0D0F12]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#C9A84C]"></div>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  const currentState = qStates[currentQuestion.id] || { selected: null, isMarked: false, isVisited: true };

  const formatTimer = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return `${hours > 0 ? hours.toString().padStart(2, "0") + ":" : ""}${mins
      .toString()
      .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const saveAnswerToDb = async (qId: string, selected: string | null, isMarked: boolean, isVisited: boolean) => {
    try {
      await fetch(`/api/attempts/${attemptId}/save-answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionId: qId,
          selected,
          isMarked,
          isVisited
        })
      });
    } catch (err) {
      console.error("Error auto-saving answer:", err);
    }
  };

  const navigateToQuestion = (index: number) => {
    if (index < 0 || index >= questions.length) return;

    setQStates((prev) => {
      const next = { ...prev };
      const curr = next[questions[index].id] || { selected: null, isMarked: false, isVisited: false };
      const updated = { ...curr, isVisited: true };
      next[questions[index].id] = updated;
      saveAnswerToDb(questions[index].id, updated.selected, updated.isMarked, updated.isVisited);
      return next;
    });

    setCurrentIndex(index);
  };

  const handleSelectOption = (option: "A" | "B" | "C" | "D") => {
    setQStates((prev) => {
      const curr = prev[currentQuestion.id] || { selected: null, isMarked: false, isVisited: true };
      const updated = { ...curr, selected: option };
      saveAnswerToDb(currentQuestion.id, updated.selected, updated.isMarked, updated.isVisited);
      return {
        ...prev,
        [currentQuestion.id]: updated
      };
    });
  };

  const handleClearResponse = () => {
    setQStates((prev) => {
      const curr = prev[currentQuestion.id] || { selected: null, isMarked: false, isVisited: true };
      const updated = { ...curr, selected: null, isMarked: false };
      saveAnswerToDb(currentQuestion.id, updated.selected, updated.isMarked, updated.isVisited);
      return {
        ...prev,
        [currentQuestion.id]: updated
      };
    });
  };

  const handleSaveAndNext = () => {
    setQStates((prev) => {
      const curr = prev[currentQuestion.id] || { selected: null, isMarked: false, isVisited: true };
      const updated = { ...curr, isMarked: false };
      saveAnswerToDb(currentQuestion.id, updated.selected, updated.isMarked, updated.isVisited);
      return {
        ...prev,
        [currentQuestion.id]: updated
      };
    });
    const nextIdx = currentIndex + 1;
    if (nextIdx < questions.length) {
      navigateToQuestion(nextIdx);
    }
  };

  const handleMarkForReviewAndNext = () => {
    setQStates((prev) => {
      const curr = prev[currentQuestion.id] || { selected: null, isMarked: false, isVisited: true };
      const updated = { ...curr, isMarked: true };
      saveAnswerToDb(currentQuestion.id, updated.selected, updated.isMarked, updated.isVisited);
      return {
        ...prev,
        [currentQuestion.id]: updated
      };
    });
    const nextIdx = currentIndex + 1;
    if (nextIdx < questions.length) {
      navigateToQuestion(nextIdx);
    }
  };

  const handleUnmarkReview = () => {
    setQStates((prev) => {
      const curr = prev[currentQuestion.id] || { selected: null, isMarked: false, isVisited: true };
      const updated = { ...curr, isMarked: false };
      saveAnswerToDb(currentQuestion.id, updated.selected, updated.isMarked, updated.isVisited);
      return {
        ...prev,
        [currentQuestion.id]: updated
      };
    });
  };

  let answeredCount = 0;
  let markedCount = 0;
  let markedAnsweredCount = 0;
  let notAnsweredCount = 0;
  let notVisitedCount = 0;

  questions.forEach((q) => {
    const s = qStates[q.id];
    if (!s) {
      notVisitedCount++;
      return;
    }

    if (s.isMarked) {
      if (s.selected) markedAnsweredCount++;
      else markedCount++;
    } else if (s.selected) {
      answeredCount++;
    } else if (s.isVisited) {
      notAnsweredCount++;
    } else {
      notVisitedCount++;
    }
  });

  const isFinalSection = currentSection.order === allSections[allSections.length - 1]?.order;

  return (
    <>
      {/* DESKTOP VIEWPORT (md:flex, hidden on mobile) */}
      <div className="hidden md:flex h-screen overflow-hidden bg-[#0D0F12] text-[#EEF0E8] flex-col justify-between select-none font-body">
        {/* 1. TOP BAR */}
        <header className="bg-[#1C2415] border-b border-[#2E3B1E] px-6 py-3 flex justify-between items-center h-16 flex-shrink-0">
          <div className="flex items-center gap-3 max-w-[45%] sm:max-w-none">
            <span className="label-badge text-[#8B9E6A] hidden sm:inline">Sections:</span>
            <div className="flex gap-2 overflow-x-auto whitespace-nowrap no-scrollbar pb-0.5">
              {allSections.map((sec) => {
                const isActive = sec.id === currentSection.id;
                let secClass = "bg-[#1C2415] border border-[#2E3B1E] text-gray-500 opacity-60";

                if (isActive) {
                  secClass = "bg-[#2E3B1E] border border-[#C9A84C] text-[#C9A84C]";
                } else if (sec.isCompleted) {
                  secClass = "bg-[#1C2415]/80 border border-[#2E3B1E] text-gray-400 font-semibold";
                }

                return (
                  <button
                    key={sec.id}
                    disabled
                    className={`label-badge px-2.5 py-1.5 rounded-sm uppercase flex items-center gap-1.5 transition text-[10px] font-bold flex-shrink-0 ${secClass}`}
                  >
                    {sec.subject}
                    {sec.isCompleted && <Check className="w-3 h-3 text-[#4A7C59]" />}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="hidden lg:flex items-center gap-8 text-sm">
            <div className="flex items-center gap-2">
              <span className="font-display font-bold text-md uppercase tracking-wider text-[#EEF0E8]">Question {currentIndex + 1}</span>
              <div className="flex items-center gap-1.5">
                <span className="bg-[#4A7C59] text-[#EEF0E8] font-mono font-semibold text-xs px-2.5 py-0.5 rounded-sm">
                  +{currentSection.marksPerQ.toFixed(3)}
                </span>
                <span className="bg-[#D94F3D] text-[#EEF0E8] font-mono font-semibold text-xs px-2.5 py-0.5 rounded-sm">
                  -{currentSection.negativeMarks.toFixed(5)}
                </span>
              </div>
            </div>
            
            <div className="flex items-center gap-1.5 font-semibold">
              <span className="text-[#8B9E6A] font-display text-xs uppercase tracking-wider">Spent:</span>
              <span className="font-mono text-[#2C6E8A] bg-[#0D0F12] border border-[#2E3B1E] px-2 py-0.5 rounded">
                {formatTimer(questionTime)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4 sm:gap-6">
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#8B9E6A] font-display font-bold uppercase tracking-wider hidden sm:inline">Time Left:</span>
              <span className={`font-mono text-lg sm:text-xl font-bold border-none ${
                timeLeft < 300 ? "text-[#D94F3D] animate-pulse-timer" : "text-[#C9A84C]"
              }`}>
                {formatTimer(timeLeft)}
              </span>
            </div>

            <div className="hidden sm:flex items-center gap-2 text-xs text-[#8B9E6A] font-display font-bold uppercase tracking-wider border-l border-[#2E3B1E] pl-4">
              <span>Language: </span>
              <select className="border border-[#2E3B1E] rounded-sm px-1.5 py-1 bg-[#1C2415] text-[#EEF0E8] focus:outline-none focus:ring-1 focus:ring-[#C9A84C]">
                <option>English</option>
              </select>
            </div>

            <button
              onClick={() => setShowPalette(true)}
              className="md:hidden px-3 py-1.5 bg-[#C9A84C] text-[#0D0F12] rounded font-display font-bold text-[10px] uppercase tracking-wider hover:bg-[#F0D080] transition"
            >
              Palette
            </button>
          </div>
        </header>

        {/* 2. BODY CONTENT PANEL */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left question panel (Dark #0D0F12) */}
          <div className="flex-1 flex flex-col justify-between overflow-y-auto bg-[#0D0F12]">
            <div className="p-4 sm:p-8 max-w-4xl w-full mx-auto">
              <div className="lg:hidden flex items-center justify-between border-b border-[#2E3B1E] pb-4 mb-6">
                <span className="font-display font-bold text-[#EEF0E8]">Question {currentIndex + 1} of {questions.length}</span>
                <span className="font-mono bg-[#1C2415] border border-[#2E3B1E] px-2.5 py-0.5 rounded text-xs">
                  Spent: {formatTimer(questionTime)}
                </span>
              </div>

              <div className="bg-[#1C2415] p-4 sm:p-6 rounded border border-[#2E3B1E] shadow-sm mb-4 sm:mb-6">
                <h2 className="flex gap-2">
                  <span className="font-display font-bold text-md text-[#C9A84C] mt-0.5">Q {currentIndex + 1}.</span>
                  <span className="question-text text-[#EEF0E8]">{currentQuestion.questionText}</span>
                </h2>
              </div>

              {/* Options */}
              <div className="space-y-3">
                {(["A", "B", "C", "D"] as const).map((opt) => {
                  const optText = currentQuestion[`option${opt}`] as string;
                  const isSelected = currentState.selected === opt;

                  return (
                    <button
                      key={opt}
                      onClick={() => handleSelectOption(opt)}
                      className={`w-full flex items-start text-left gap-3 sm:gap-4 p-3 sm:p-4 rounded border transition duration-150 ${
                        isSelected
                          ? "bg-[#2E3B1E] border-[#C9A84C] text-[#F0D080] font-semibold"
                          : "bg-[#1C2415] border-[#2E3B1E] hover:bg-[#2E3B1E]/30 text-[#EEF0E8]"
                      }`}
                    >
                      <span
                        className={`w-5 h-5 rounded-full border flex items-center justify-center text-[10px] font-extrabold flex-shrink-0 mt-0.5 ${
                          isSelected ? "bg-[#C9A84C] border-[#C9A84C] text-[#0D0F12]" : "border-[#8B9E6A] bg-[#0D0F12] text-[#8B9E6A]"
                        }`}
                      >
                        {opt}
                      </span>
                      <span className="text-sm font-body font-medium leading-relaxed">{optText}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Sticky Actions Footer */}
            <footer className="sticky bottom-0 bg-[#1C2415] border-t border-[#2E3B1E] px-3 sm:px-6 py-3 sm:py-4 flex justify-between items-center z-10 flex-wrap sm:flex-nowrap gap-2">
              <div className="flex gap-2 sm:gap-3">
                {currentState.isMarked ? (
                  <button
                    onClick={handleUnmarkReview}
                    className="btn-secondary text-[10px] sm:text-xs px-2.5 sm:px-4 py-2 sm:py-2.5 bg-[#6B4E8A]/20 border-[#6B4E8A] text-[#EEF0E8] hover:bg-[#6B4E8A]/45 font-bold uppercase tracking-wider"
                  >
                    Unmark
                  </button>
                ) : (
                  <button
                    onClick={handleMarkForReviewAndNext}
                    className="btn-secondary text-[10px] sm:text-xs px-2.5 sm:px-4 py-2 sm:py-2.5 font-bold uppercase tracking-wider"
                  >
                    <span className="hidden sm:inline">Mark for Review & Next</span>
                    <span className="sm:hidden">Mark & Next</span>
                  </button>
                )}
                <button
                  onClick={handleClearResponse}
                  className="btn-secondary text-[10px] sm:text-xs px-2.5 sm:px-4 py-2 sm:py-2.5 font-bold uppercase tracking-wider"
                >
                  <span className="hidden sm:inline">Clear Response</span>
                  <span className="sm:hidden">Clear</span>
                </button>
              </div>

              <div className="flex items-center gap-2 sm:gap-3">
                <button
                  onClick={() => navigateToQuestion(currentIndex - 1)}
                  disabled={currentIndex === 0}
                  className="p-1.5 sm:p-2.5 border border-[#2E3B1E] bg-[#0D0F12] rounded hover:bg-[#1C2415] disabled:opacity-30 disabled:hover:bg-transparent transition"
                >
                  <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5 text-[#8B9E6A]" />
                </button>
                <button
                  onClick={() => navigateToQuestion(currentIndex + 1)}
                  disabled={currentIndex === questions.length - 1}
                  className="p-1.5 sm:p-2.5 border border-[#2E3B1E] bg-[#0D0F12] rounded hover:bg-[#1C2415] disabled:opacity-30 disabled:hover:bg-transparent transition"
                >
                  <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-[#8B9E6A]" />
                </button>
                
                <button
                  onClick={handleSaveAndNext}
                  className="btn-primary text-[10px] sm:text-xs py-2 sm:py-2.5 px-3 sm:px-6 font-bold"
                >
                  Save & Next
                </button>
              </div>
            </footer>
          </div>

          {/* Backdrop for palette drawer on mobile */}
          {showPalette && (
            <div
              className="fixed inset-0 bg-black/65 z-40 md:hidden transition-opacity duration-300"
              onClick={() => setShowPalette(false)}
            />
          )}

          {/* Right Palette Panel (#1C2415) */}
          <aside
            className={`fixed inset-y-0 right-0 z-50 w-80 border-l border-[#2E3B1E] bg-[#1C2415] flex flex-col justify-between transition-transform duration-300 transform ${
              showPalette ? "translate-x-0" : "translate-x-full"
            } md:translate-x-0 md:static md:flex flex-shrink-0`}
          >
            <div className="overflow-y-auto flex-1 no-scrollbar">
              {/* Student info */}
              <div className="p-4 border-b border-[#2E3B1E] flex items-center justify-between bg-[#0D0F12]/60">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-[#C9A84C] text-[#0D0F12] rounded flex items-center justify-center shadow">
                    <User className="w-5 h-5 fill-current" />
                  </div>
                  <div>
                    <h4 className="font-display font-bold text-sm tracking-wide text-[#EEF0E8] leading-tight uppercase">{studentName}</h4>
                    <span className="text-[10px] text-[#8B9E6A] font-display font-semibold uppercase tracking-widest">Candidate</span>
                  </div>
                </div>
                {/* Close button for mobile palette drawer */}
                <button
                  onClick={() => setShowPalette(false)}
                  className="md:hidden p-1 text-[#8B9E6A] hover:text-[#EEF0E8] transition"
                  aria-label="Close Palette"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Legend row Grid */}
              <div className="p-4 grid grid-cols-2 gap-2.5 text-[10px] font-display font-bold text-[#8B9E6A] border-b border-[#2E3B1E]/50">
                <div className="flex items-center gap-1.5">
                  <span className="w-4 h-4 bg-[#4A7C59] rounded-sm flex items-center justify-center text-white text-[9px]">
                    {answeredCount}
                  </span>
                  <span>Answered</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-4 h-4 bg-[#6B4E8A] rounded-sm flex items-center justify-center text-white text-[9px]">
                    {markedCount}
                  </span>
                  <span>Marked</span>
                </div>
                <div className="flex items-center gap-1.5 col-span-2">
                  <span className="w-4 h-4 bg-[#6B4E8A] border border-[#C9A84C] rounded-sm flex items-center justify-center text-white text-[9px] relative">
                    <Check className="w-2.5 h-2.5 text-white" />
                  </span>
                  <span>Marked & Answered ({markedAnsweredCount})</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-4 h-4 bg-[#D94F3D] rounded-sm flex items-center justify-center text-white text-[9px]">
                    {notAnsweredCount}
                  </span>
                  <span>Not Answered</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-4 h-4 bg-[#0D0F12] border border-[#2E3B1E] rounded-sm flex items-center justify-center text-[#8B9E6A] text-[9px]">
                    {notVisitedCount}
                  </span>
                  <span>Not Visited</span>
                </div>
              </div>

              <div className="px-4 py-2.5 bg-[#0D0F12] text-[#EEF0E8] label-badge border-b border-[#2E3B1E] flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5" /> Section : {currentSection.subject}
              </div>

              {/* Questions Grid */}
              <div className="p-4">
                <div className="grid grid-cols-5 gap-2 justify-center">
                  {questions.map((q, idx) => {
                    const s = qStates[q.id];
                    const isCurrent = idx === currentIndex;

                    // Palette buttons styling strictly mapped
                    let btnClass = "bg-[#0D0F12] border border-[#2E3B1E] text-[#8B9E6A]"; // unvisited
                    let badgeIcon = false;

                    if (s) {
                      if (s.isMarked) {
                        if (s.selected) {
                          btnClass = "bg-[#6B4E8A] text-white border border-[#C9A84C]";
                          badgeIcon = true;
                        } else {
                          btnClass = "bg-[#6B4E8A] text-white border-none";
                        }
                      } else if (s.selected) {
                        btnClass = "bg-[#4A7C59] text-[#EEF0E8] border-none";
                      } else if (s.isVisited) {
                        btnClass = "bg-[#D94F3D] text-[#EEF0E8] border-none";
                      }
                    }

                    return (
                      <button
                        key={q.id}
                        onClick={() => {
                          navigateToQuestion(idx);
                          setShowPalette(false);
                        }}
                        className={`w-[38px] h-[38px] rounded-sm flex items-center justify-center font-display text-sm font-semibold transition relative ${btnClass} ${
                          isCurrent ? "ring-2 ring-[#C9A84C] ring-offset-1 ring-offset-[#1C2415]" : ""
                        }`}
                      >
                        {idx + 1}
                        {badgeIcon && (
                          <span className="absolute bottom-0.5 right-0.5 bg-green-500 rounded-full w-1.5 h-1.5 flex items-center justify-center">
                            <Check className="w-1 h-1 text-white" />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-[#2E3B1E] space-y-3 bg-[#0D0F12]/60">
              <div className="grid grid-cols-2 gap-2 text-xs font-display font-bold uppercase tracking-wider text-gray-700">
                <button
                  onClick={() => alert("Mark correct answers and select Save & Next. Timer will auto submit at 00:00.")}
                  className="w-full py-2 bg-transparent border border-[#2E3B1E] hover:border-[#8B9E6A] text-[#8B9E6A] transition rounded-sm"
                >
                  Instructions
                </button>
                <button
                  onClick={() => alert("NDA/CDS Exam Question Paper compilation.")}
                  className="w-full py-2 bg-transparent border border-[#2E3B1E] hover:border-[#8B9E6A] text-[#8B9E6A] transition rounded-sm"
                >
                  Question Paper
                </button>
              </div>
              
              <button
                onClick={() => setShowSubmitModal(true)}
                className="w-full btn-primary py-3 mt-1 text-sm tracking-widest font-bold font-display uppercase"
              >
                {isFinalSection ? "Submit Test" : "Submit Section"}
              </button>
            </div>
          </aside>
        </div>
      </div>

      {/* MOBILE VIEWPORT (md:hidden) */}
      <div className="flex md:hidden flex-col h-screen overflow-hidden bg-[#0D0F12] text-[#EEF0E8] select-none font-body">
        {/* 1. TOP HEADER */}
        <header className="bg-[#1C2415] border-b border-[#2E3B1E] px-4 py-3 flex justify-between items-center h-14 flex-shrink-0">
          <div className="flex items-center gap-2">
            <button 
              onClick={() => {
                if (confirm("Are you sure you want to exit the test? Your progress will be saved.")) {
                  router.push("/student/dashboard");
                }
              }}
              className="p-1 hover:bg-[#2E3B1E] rounded transition"
            >
              <ChevronLeft className="w-6 h-6 text-[#8B9E6A]" />
            </button>
            <span className="font-display font-bold text-sm uppercase tracking-wider text-[#EEF0E8] truncate max-w-[120px]">
              {testTitle}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-[#C9A84C]" />
              <span className={`font-mono text-sm font-bold ${timeLeft < 300 ? "text-[#D94F3D] animate-pulse-timer" : "text-[#C9A84C]"}`}>
                {formatTimer(timeLeft)}
              </span>
            </div>
            <button
              onClick={() => setShowSubmitModal(true)}
              className="btn-primary text-[10px] py-1 px-3 font-bold"
            >
              Submit
            </button>
          </div>
        </header>

        {/* 2. SECTION TABS ROW */}
        <div className="bg-[#1C2415] border-b border-[#2E3B1E] h-10 flex-shrink-0 flex items-center overflow-x-auto whitespace-nowrap no-scrollbar px-4 gap-4">
          {allSections.map((sec) => {
            const isActive = sec.id === currentSection.id;
            return (
              <button
                key={sec.id}
                disabled
                className={`label-badge text-[10px] font-bold uppercase tracking-wider h-full flex items-center border-b-2 transition ${
                  isActive 
                    ? "border-[#C9A84C] text-[#C9A84C] font-extrabold" 
                    : "border-transparent text-gray-500"
                }`}
              >
                {sec.subject}
              </button>
            );
          })}
        </div>

        {/* 3. QUESTION STATS ROW */}
        <div className="bg-[#0D0F12] border-b border-[#2E3B1E] px-4 py-2 flex justify-between items-center h-10 flex-shrink-0 text-xs font-semibold text-[#8B9E6A]">
          <div className="flex items-center gap-2">
            <span className="font-display font-bold text-[#EEF0E8] text-sm">Q. {currentIndex + 1}</span>
            <span className="text-[10px] px-1.5 py-0.5 bg-[#4A7C59]/10 text-[#4A7C59] border border-[#4A7C59]/25 rounded-sm">
              +{currentSection.marksPerQ.toFixed(1)}
            </span>
            <span className="text-[10px] px-1.5 py-0.5 bg-[#D94F3D]/10 text-[#D94F3D] border border-[#D94F3D]/25 rounded-sm">
              -{currentSection.negativeMarks.toFixed(2)}
            </span>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 text-[11px]">
              <Clock className="w-3.5 h-3.5 text-[#2C6E8A]" />
              <span className="font-mono text-[#2C6E8A]">{formatTimer(questionTime)}</span>
            </div>
            <button
              onClick={() => setShowPalette(true)}
              className="px-2.5 py-1 border border-[#2E3B1E] text-gray-400 hover:text-[#EEF0E8] rounded-sm text-[10px] font-display uppercase tracking-wider bg-[#1C2415]"
            >
              Palette
            </button>
          </div>
        </div>

        {/* 4. MAIN QUESTION & OPTIONS AREA (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-20">
          <div className="bg-[#1C2415] p-4 rounded border border-[#2E3B1E]">
            <p className="question-text text-[#EEF0E8] text-sm leading-relaxed whitespace-pre-wrap">
              {currentQuestion.questionText}
            </p>
          </div>

          <div className="space-y-2.5">
            {(["A", "B", "C", "D"] as const).map((opt) => {
              const optText = currentQuestion[`option${opt}`] as string;
              const isSelected = currentState.selected === opt;

              return (
                <button
                  key={opt}
                  onClick={() => handleSelectOption(opt)}
                  className={`w-full flex items-start text-left gap-3 p-3.5 rounded border transition ${
                    isSelected
                      ? "bg-[#2E3B1E] border-[#C9A84C] text-[#F0D080] font-semibold"
                      : "bg-[#1C2415] border-[#2E3B1E] hover:bg-[#2E3B1E]/30 text-[#EEF0E8]"
                  }`}
                >
                  <span
                    className={`w-5 h-5 rounded-full border flex items-center justify-center text-[10px] font-extrabold flex-shrink-0 mt-0.5 ${
                      isSelected ? "bg-[#C9A84C] border-[#C9A84C] text-[#0D0F12]" : "border-[#8B9E6A] bg-[#0D0F12] text-[#8B9E6A]"
                    }`}
                  >
                    {opt}
                  </span>
                  <span className="text-xs font-body font-medium leading-relaxed">{optText}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 5. STICKY ACTIONS FOOTER */}
        <footer className="fixed bottom-0 inset-x-0 bg-[#1C2415] border-t border-[#2E3B1E] px-4 py-3 flex justify-between items-center z-30 h-14 flex-shrink-0">
          <div className="flex gap-2">
            {currentState.isMarked ? (
              <button
                onClick={handleUnmarkReview}
                className="px-3 py-2 border border-[#6B4E8A] bg-[#6B4E8A]/10 text-white rounded text-[10px] font-bold uppercase tracking-wider"
              >
                Unmark
              </button>
            ) : (
              <button
                onClick={handleMarkForReviewAndNext}
                className="px-3 py-2 border border-[#2E3B1E] text-[#8B9E6A] hover:bg-[#2E3B1E]/20 rounded text-[10px] font-bold uppercase tracking-wider"
              >
                Mark
              </button>
            )}
            <button
              onClick={handleClearResponse}
              className="px-3 py-2 border border-[#2E3B1E] text-[#8B9E6A] hover:bg-[#2E3B1E]/20 rounded text-[10px] font-bold uppercase tracking-wider"
            >
              Clear
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => navigateToQuestion(currentIndex - 1)}
              disabled={currentIndex === 0}
              className="p-2 border border-[#2E3B1E] bg-[#0D0F12] rounded hover:bg-[#1C2415] disabled:opacity-30 transition"
            >
              <ChevronLeft className="w-4 h-4 text-[#8B9E6A]" />
            </button>
            <button
              onClick={() => navigateToQuestion(currentIndex + 1)}
              disabled={currentIndex === questions.length - 1}
              className="p-2 border border-[#2E3B1E] bg-[#0D0F12] rounded hover:bg-[#1C2415] disabled:opacity-30 transition"
            >
              <ChevronRight className="w-4 h-4 text-[#8B9E6A]" />
            </button>
            <button
              onClick={handleSaveAndNext}
              className="btn-primary text-[11px] py-2.5 px-4 font-bold"
            >
              Save & Next
            </button>
          </div>
        </footer>
      </div>

      {/* Palette Overlay backdrop & Slide-in right drawer for mobile */}
      {showPalette && (
        <div
          className="fixed inset-0 bg-black/65 z-40 md:hidden transition-opacity duration-300"
          onClick={() => setShowPalette(false)}
        />
      )}
      <aside
        className={`fixed inset-y-0 right-0 z-50 w-80 border-l border-[#2E3B1E] bg-[#1C2415] flex flex-col justify-between transition-transform duration-300 transform ${
          showPalette ? "translate-x-0" : "translate-x-full"
        } md:hidden`}
      >
        <div className="overflow-y-auto flex-1 no-scrollbar">
          <div className="p-4 border-b border-[#2E3B1E] flex items-center justify-between bg-[#0D0F12]/60">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-[#C9A84C] text-[#0D0F12] rounded flex items-center justify-center shadow">
                <User className="w-5 h-5 fill-current" />
              </div>
              <div>
                <h4 className="font-display font-bold text-sm tracking-wide text-[#EEF0E8] leading-tight uppercase">{studentName}</h4>
                <span className="text-[10px] text-[#8B9E6A] font-display font-semibold uppercase tracking-widest">Candidate</span>
              </div>
            </div>
            <button
              onClick={() => setShowPalette(false)}
              className="p-1 text-[#8B9E6A] hover:text-[#EEF0E8] transition"
              aria-label="Close Palette"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-4 grid grid-cols-2 gap-2.5 text-[10px] font-display font-bold text-[#8B9E6A] border-b border-[#2E3B1E]/50">
            <div className="flex items-center gap-1.5">
              <span className="w-4 h-4 bg-[#4A7C59] rounded-sm flex items-center justify-center text-white text-[9px]">
                {answeredCount}
              </span>
              <span>Answered</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-4 h-4 bg-[#6B4E8A] rounded-sm flex items-center justify-center text-white text-[9px]">
                {markedCount}
              </span>
              <span>Marked</span>
            </div>
            <div className="flex items-center gap-1.5 col-span-2">
              <span className="w-4 h-4 bg-[#6B4E8A] border border-[#C9A84C] rounded-sm flex items-center justify-center text-white text-[9px] relative">
                <Check className="w-2.5 h-2.5 text-white" />
              </span>
              <span>Marked & Answered ({markedAnsweredCount})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-4 h-4 bg-[#D94F3D] rounded-sm flex items-center justify-center text-white text-[9px]">
                {notAnsweredCount}
              </span>
              <span>Not Answered</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-4 h-4 bg-[#0D0F12] border border-[#2E3B1E] rounded-sm flex items-center justify-center text-[#8B9E6A] text-[9px]">
                {notVisitedCount}
              </span>
              <span>Not Visited</span>
            </div>
          </div>

          <div className="px-4 py-2.5 bg-[#0D0F12] text-[#EEF0E8] label-badge border-b border-[#2E3B1E] flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5" /> Section : {currentSection.subject}
          </div>

          <div className="p-4">
            <div className="grid grid-cols-5 gap-2 justify-center">
              {questions.map((q, idx) => {
                const s = qStates[q.id];
                const isCurrent = idx === currentIndex;

                let btnClass = "bg-[#0D0F12] border border-[#2E3B1E] text-[#8B9E6A]";
                let badgeIcon = false;

                if (s) {
                  if (s.isMarked) {
                    if (s.selected) {
                      btnClass = "bg-[#6B4E8A] text-white border border-[#C9A84C]";
                      badgeIcon = true;
                    } else {
                      btnClass = "bg-[#6B4E8A] text-white border-none";
                    }
                  } else if (s.selected) {
                    btnClass = "bg-[#4A7C59] text-[#EEF0E8] border-none";
                  } else if (s.isVisited) {
                    btnClass = "bg-[#D94F3D] text-[#EEF0E8] border-none";
                  }
                }

                return (
                  <button
                    key={q.id}
                    onClick={() => {
                      navigateToQuestion(idx);
                      setShowPalette(false);
                    }}
                    className={`w-[38px] h-[38px] rounded-sm flex items-center justify-center font-display text-sm font-semibold transition relative ${btnClass} ${
                      isCurrent ? "ring-2 ring-[#C9A84C] ring-offset-1 ring-offset-[#1C2415]" : ""
                    }`}
                  >
                    {idx + 1}
                    {badgeIcon && (
                      <span className="absolute bottom-0.5 right-0.5 bg-green-500 rounded-full w-1.5 h-1.5 flex items-center justify-center">
                        <Check className="w-1 h-1 text-white" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-[#2E3B1E] space-y-3 bg-[#0D0F12]/60">
          <div className="grid grid-cols-2 gap-2 text-xs font-display font-bold uppercase tracking-wider text-gray-700">
            <button
              onClick={() => alert("Mark correct answers and select Save & Next. Timer will auto submit at 00:00.")}
              className="w-full py-2 bg-transparent border border-[#2E3B1E] hover:border-[#8B9E6A] text-[#8B9E6A] transition rounded-sm"
            >
              Instructions
            </button>
            <button
              onClick={() => alert("NDA/CDS Exam Question Paper compilation.")}
              className="w-full py-2 bg-transparent border border-[#2E3B1E] hover:border-[#8B9E6A] text-[#8B9E6A] transition rounded-sm"
            >
              Question Paper
            </button>
          </div>
          
          <button
            onClick={() => setShowSubmitModal(true)}
            className="w-full btn-primary py-3 mt-1 text-sm tracking-widest font-bold font-display uppercase"
          >
            {isFinalSection ? "Submit Test" : "Submit Section"}
          </button>
        </div>
      </aside>

      {/* 3. SUBMIT MODAL */}
      {showSubmitModal && (
        <div className="fixed inset-0 bg-[#0D0F12]/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1C2415] rounded border border-[#2E3B1E] w-full max-w-md p-6 shadow-2xl">
            <div className="text-center mb-6">
              <div className="w-12 h-12 bg-[#2E3B1E] border border-[#C9A84C] text-[#C9A84C] rounded flex items-center justify-center mx-auto mb-3 shadow">
                <Info className="w-6 h-6" />
              </div>
              <h3 className="font-display font-bold text-xl uppercase tracking-wider text-[#EEF0E8]">
                {isFinalSection ? "Submit Test?" : `Submit ${currentSection.subject}?`}
              </h3>
              <p className="text-xs text-[#8B9E6A] font-semibold mt-1">
                {isFinalSection
                  ? "Are you sure you want to end your exam session? Scores calculate immediately."
                  : `Are you sure you want to submit the ${currentSection.subject} section? You cannot return to this section afterwards.`}
              </p>
            </div>

            <div className="bg-[#0D0F12] rounded p-4 mb-6 border border-[#2E3B1E] text-xs font-display font-bold text-[#8B9E6A] space-y-2.5">
              <div className="flex justify-between">
                <span>Answered Questions:</span>
                <span className="text-[#4A7C59]">{answeredCount + markedAnsweredCount}</span>
              </div>
              <div className="flex justify-between">
                <span>Marked for Review:</span>
                <span className="text-[#6B4E8A]">{markedCount}</span>
              </div>
              <div className="flex justify-between">
                <span>Unanswered/Visited:</span>
                <span className="text-[#D94F3D]">{notAnsweredCount}</span>
              </div>
              <div className="flex justify-between border-t border-[#2E3B1E] pt-2.5 font-extrabold text-[#EEF0E8]">
                <span>Total Section Questions:</span>
                <span>{questions.length}</span>
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => setShowSubmitModal(false)}
                className="flex-1 btn-secondary py-2.5 text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleManualSubmit}
                disabled={submitting}
                className="flex-1 btn-primary py-2.5 text-xs font-bold"
              >
                {submitting ? "Submitting..." : "Submit"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
