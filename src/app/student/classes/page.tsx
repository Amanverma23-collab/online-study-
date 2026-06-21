"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Star,
  LogOut,
  Radio,
  Film,
  Calendar,
  Clock,
  ExternalLink,
  FileText,
  ArrowLeft,
  ChevronRight,
  Video,
} from "lucide-react";
import Link from "next/link";

interface LiveClass {
  id: string;
  subject: string;
  title: string;
  details: string;
  zoomLink: string;
  classDate: string;
  isEnded?: boolean;
  createdAt: string;
}

interface RecordedSubject {
  subject: string;
  count: number;
}

interface RecordedClass {
  id: string;
  subject: string;
  className: string;
  details: string;
  youtubeLink: string;
  notesUrl: string | null;
  notesName: string | null;
  createdAt: string;
}

// Subject → emoji mapping
const subjectIcons: Record<string, string> = {
  "General Knowledge": "🌍",
  Mathematics: "📐",
  English: "📖",
  Physics: "⚛️",
  Chemistry: "🧪",
  History: "🏛️",
  Geography: "🗺️",
  "Current Affairs": "📰",
  Reasoning: "🧠",
  Biology: "🧬",
};

export default function StudentClassesPage() {
  const router = useRouter();
  const [studentId, setStudentId] = useState("");
  const [studentName, setStudentName] = useState("");
  const [studentBatch, setStudentBatch] = useState("NDA");
  const [activeTab, setActiveTab] = useState<"live" | "recorded">("live");
  const [loading, setLoading] = useState(true);

  // Live class state
  const [liveClasses, setLiveClasses] = useState<LiveClass[]>([]);
  const [liveFilter, setLiveFilter] = useState<string>("All");

  // Recorded class state
  const [recordedSubjects, setRecordedSubjects] = useState<RecordedSubject[]>(
    []
  );
  const [selectedRecordedSubject, setSelectedRecordedSubject] = useState<
    string | null
  >(null);
  const [recordedClasses, setRecordedClasses] = useState<RecordedClass[]>([]);
  const [recordedLoading, setRecordedLoading] = useState(false);

  useEffect(() => {
    const sId = localStorage.getItem("studentId");
    const sName = localStorage.getItem("studentName");
    const sBatch = localStorage.getItem("studentBatch") || "NDA";
    if (!sId || !sName) {
      router.push("/");
      return;
    }
    setStudentId(sId);
    setStudentName(sName);
    setStudentBatch(sBatch);
    fetchInitialData(sId);
  }, []);

  const fetchInitialData = async (sId: string) => {
    try {
      const [liveRes, subjectsRes] = await Promise.all([
        fetch(`/api/classes/live?studentId=${sId}`),
        fetch(`/api/classes/recorded/subjects?studentId=${sId}`),
      ]);
      setLiveClasses(await liveRes.json());
      setRecordedSubjects(await subjectsRes.json());
    } catch (err) {
      console.error("Failed to fetch classes data:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecordedForSubject = async (subject: string) => {
    setRecordedLoading(true);
    setSelectedRecordedSubject(subject);
    try {
      const res = await fetch(
        `/api/classes/recorded?subject=${encodeURIComponent(subject)}&studentId=${studentId}`
      );
      setRecordedClasses(await res.json());
    } catch (err) {
      console.error("Failed to fetch recorded classes:", err);
    } finally {
      setRecordedLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getClassStatus = (cls: LiveClass) => {
    if (cls.isEnded) {
      return "past";
    }
    const now = new Date();
    const date = new Date(cls.classDate);
    const diffMs = date.getTime() - now.getTime();
    const diffMins = diffMs / (1000 * 60);

    // "Live now" if within a 90-minute window around the scheduled time
    if (diffMins >= -90 && diffMins <= 10) {
      return "live";
    }
    if (diffMins > 10) {
      return "upcoming";
    }
    return "past";
  };

  const getCountdownText = (classDate: string) => {
    const now = new Date();
    const date = new Date(classDate);
    const diffMs = date.getTime() - now.getTime();

    if (diffMs <= 0) return "";

    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor(
      (diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
    );
    const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) return `in ${days}d ${hours}h`;
    if (hours > 0) return `in ${hours}h ${mins}m`;
    return `in ${mins}m`;
  };

  // Helper to determine if an ended live class is from a past day relative to today in student's local timezone.
  // Such classes should be automatically hidden at 12:00 AM (midnight) of the day after they are scheduled.
  const isClassVisible = (cls: LiveClass) => {
    const status = getClassStatus(cls);
    if (status !== "past") {
      return true;
    }
    const now = new Date();
    const classDate = new Date(cls.classDate);
    const nowDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const clsDate = new Date(classDate.getFullYear(), classDate.getMonth(), classDate.getDate());
    return nowDate.getTime() <= clsDate.getTime();
  };

  const visibleLiveClasses = liveClasses.filter(isClassVisible);

  // Get unique subjects from visible live classes for filter
  const liveSubjects = Array.from(
    new Set(visibleLiveClasses.map((c) => c.subject))
  );

  const filteredLiveClasses =
    liveFilter === "All"
      ? visibleLiveClasses
      : visibleLiveClasses.filter((c) => c.subject === liveFilter);

  return (
    <main className="flex-1 p-6 md:p-8 pt-14 md:pt-0 overflow-y-auto h-full flex flex-col no-scrollbar bg-[#F5F3EC]">
      {/* Header */}
      <div className="sticky top-14 md:top-0 z-30 bg-[#F5F3EC] -mx-6 md:-mx-8 px-6 md:px-8 pt-0 md:pt-6 mt-0 flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-8 border-b border-[#DDD8CC] pb-6">
        <div>
          <h1 className="page-title text-[#0D0F12] uppercase font-bold !text-[14px] sm:!text-xl md:!text-2xl !tracking-tighter sm:!tracking-normal whitespace-nowrap">
            Live & Recorded Classes
          </h1>
          <p className="text-sm text-[#8B9E6A] font-body mt-1">
            Attend live Zoom sessions & view unlisted class archives
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#C9A84C]"></div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col min-h-0">
          {/* Tab Buttons */}
          <div className="flex w-full border-b border-[#DDD8CC] mb-8 font-display font-bold uppercase tracking-wider text-xs sm:text-sm">
            <button
              onClick={() => setActiveTab("live")}
              className={`flex-1 sm:flex-initial px-3 sm:px-8 py-3.5 text-center justify-center border-b-2 transition flex items-center gap-1.5 sm:gap-2 whitespace-nowrap ${
                activeTab === "live"
                  ? "border-[#C9A84C] text-[#C9A84C]"
                  : "border-transparent text-[#8B9E6A] hover:text-[#0D0F12]"
              }`}
            >
              <Radio className="w-4 h-4 flex-shrink-0" /> Live Class
            </button>
            <button
              onClick={() => {
                setActiveTab("recorded");
                setSelectedRecordedSubject(null);
              }}
              className={`flex-1 sm:flex-initial px-3 sm:px-8 py-3.5 text-center justify-center border-b-2 transition flex items-center gap-1.5 sm:gap-2 whitespace-nowrap ${
                activeTab === "recorded"
                  ? "border-[#C9A84C] text-[#C9A84C]"
                  : "border-transparent text-[#8B9E6A] hover:text-[#0D0F12]"
              }`}
            >
              <Film className="w-4 h-4 flex-shrink-0" /> Recorded Class
            </button>
          </div>

          {/* LIVE CLASS TAB */}
          {activeTab === "live" && (
            <div className="pb-8">
              {/* Subject Filter Chips */}
              {liveSubjects.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-6">
                  <button
                    onClick={() => setLiveFilter("All")}
                    className={`px-4 py-1.5 rounded-full text-xs font-display font-bold uppercase tracking-wider transition border ${
                      liveFilter === "All"
                        ? "bg-[#C9A84C] text-[#0D0F12] border-[#C9A84C]"
                        : "bg-white text-[#8B9E6A] border-[#DDD8CC] hover:border-[#C9A84C] hover:text-[#C9A84C]"
                    }`}
                  >
                    All
                  </button>
                  {liveSubjects.map((sub) => (
                    <button
                      key={sub}
                      onClick={() => setLiveFilter(sub)}
                      className={`px-4 py-1.5 rounded-full text-xs font-display font-bold uppercase tracking-wider transition border ${
                        liveFilter === sub
                          ? "bg-[#C9A84C] text-[#0D0F12] border-[#C9A84C]"
                          : "bg-white text-[#8B9E6A] border-[#DDD8CC] hover:border-[#C9A84C] hover:text-[#C9A84C]"
                      }`}
                    >
                      {sub}
                    </button>
                  ))}
                </div>
              )}

              {filteredLiveClasses.length === 0 ? (
                <div className="bg-white rounded-[6px] border border-[#DDD8CC] p-12 text-center text-gray-400 shadow-sm">
                  <Radio className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p className="font-display font-semibold uppercase tracking-wider text-[#0D0F12]">
                    No live classes available
                  </p>
                  <p className="text-xs text-[#8B9E6A] font-semibold mt-1">
                    Check back later for scheduled live sessions.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredLiveClasses.map((cls) => {
                    const status = getClassStatus(cls);
                    const countdown = getCountdownText(cls.classDate);

                    return (
                      <div
                        key={cls.id}
                        className={`bg-white rounded-[6px] border p-6 shadow-sm hover:shadow-md transition duration-150 flex flex-col justify-between ${
                          status === "live"
                            ? "border-[#D94F3D]/40 ring-1 ring-[#D94F3D]/20"
                            : status === "past"
                            ? "border-[#DDD8CC] opacity-75"
                            : "border-[#DDD8CC]"
                        }`}
                      >
                        <div>
                          <div className="flex justify-between items-start mb-3">
                            <span className="bg-[#C9A84C]/10 border border-[#C9A84C]/20 text-[#C9A84C] px-2.5 py-0.5 rounded text-[10px] font-display font-bold uppercase tracking-wider">
                              {cls.subject}
                            </span>
                            {status === "live" && (
                              <span className="inline-flex items-center gap-1 bg-[#D94F3D]/10 text-[#D94F3D] border border-[#D94F3D]/20 px-2.5 py-0.5 rounded text-[10px] font-display font-bold uppercase tracking-wider">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#D94F3D] animate-pulse"></span>
                                Live Now
                              </span>
                            )}
                            {status === "upcoming" && countdown && (
                              <span className="inline-flex items-center gap-1 bg-[#2C6E8A]/10 text-[#2C6E8A] border border-[#2C6E8A]/20 px-2.5 py-0.5 rounded text-[10px] font-display font-bold uppercase tracking-wider">
                                Upcoming {countdown}
                              </span>
                            )}
                            {status === "past" && (
                              <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-500 border border-gray-200 px-2.5 py-0.5 rounded text-[10px] font-display font-bold uppercase tracking-wider">
                                Ended
                              </span>
                            )}
                          </div>
                          <h3 className="font-display font-bold text-md text-[#0D0F12] mb-2 uppercase">
                            {cls.title}
                          </h3>
                          <p className="text-xs text-[#8B9E6A] font-semibold mb-3 line-clamp-2">
                            {cls.details}
                          </p>
                          <div className="flex items-center gap-1.5 text-xs text-gray-500 font-display font-bold uppercase tracking-wider">
                            <Calendar className="w-3.5 h-3.5" />
                            {formatDate(cls.classDate)}
                          </div>
                        </div>

                        <button
                          onClick={() =>
                            status !== "past" && window.open(cls.zoomLink, "_blank")
                          }
                          disabled={status === "past"}
                          className={`w-full mt-4 font-display font-bold uppercase tracking-widest text-xs py-2.5 rounded transition flex items-center justify-center gap-2 ${
                            status === "live"
                              ? "bg-[#D94F3D] text-white hover:bg-[#D94F3D]/90"
                              : status === "past"
                              ? "bg-gray-250 border-gray-300 text-gray-400 cursor-not-allowed"
                              : "btn-primary"
                          }`}
                        >
                          <Video className="w-4 h-4" />
                          {status === "live"
                            ? "🔴 Go Live →"
                            : status === "past"
                            ? "Class Ended"
                            : "Attend Class →"}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* RECORDED CLASS TAB */}
          {activeTab === "recorded" && !selectedRecordedSubject && (
            <div className="pb-8">
              {recordedSubjects.length === 0 ? (
                <div className="bg-white rounded-[6px] border border-[#DDD8CC] p-12 text-center text-gray-400 shadow-sm">
                  <Film className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p className="font-display font-semibold uppercase tracking-wider text-[#0D0F12]">
                    No recorded classes available
                  </p>
                  <p className="text-xs text-[#8B9E6A] font-semibold mt-1">
                    Recorded class videos will appear here once uploaded.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6">
                  {recordedSubjects.map((item) => (
                    <button
                      key={item.subject}
                      onClick={() => fetchRecordedForSubject(item.subject)}
                      className="group bg-white rounded-[6px] border border-[#DDD8CC] p-4 sm:p-6 shadow-sm hover:shadow-md hover:border-[#C9A84C]/50 transition duration-200 flex flex-col items-start text-left min-h-[120px] sm:min-h-[140px]"
                    >
                      <span className="text-2xl mb-3">
                        {subjectIcons[item.subject] || "📚"}
                      </span>
                      <h3 className="font-display font-bold text-md text-[#0D0F12] uppercase tracking-wide group-hover:text-[#C9A84C] transition">
                        {item.subject}
                      </h3>
                      <div className="mt-auto flex items-center justify-between w-full pt-3">
                        <span className="text-xs font-display font-bold uppercase tracking-wider text-[#8B9E6A]">
                          {item.count}{" "}
                          {item.count === 1 ? "Recording" : "Recordings"}
                        </span>
                        <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-[#C9A84C] transition" />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* RECORDED CLASS — Subject Drilldown */}
          {activeTab === "recorded" && selectedRecordedSubject && (
            <div className="pb-8">
              <button
                onClick={() => setSelectedRecordedSubject(null)}
                className="flex items-center gap-1.5 text-xs font-display font-bold uppercase tracking-wider text-[#8B9E6A] hover:text-[#0D0F12] transition mb-6"
              >
                <ArrowLeft className="w-4 h-4" /> All Subjects
              </button>

              <div className="flex items-center gap-2.5 border-b border-[#DDD8CC] pb-3 mb-6">
                <span className="text-xl">
                  {subjectIcons[selectedRecordedSubject] || "📚"}
                </span>
                <h2 className="font-display font-bold text-xl uppercase tracking-wider text-[#0D0F12]">
                  {selectedRecordedSubject}
                </h2>
              </div>

              {recordedLoading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#C9A84C]"></div>
                </div>
              ) : recordedClasses.length === 0 ? (
                <div className="bg-white rounded-[6px] border border-[#DDD8CC] p-10 text-center text-gray-400 shadow-sm">
                  <Film className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                  <p className="font-display font-semibold uppercase tracking-wider text-sm">
                    No recordings found
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {recordedClasses.map((cls) => (
                    <div
                      key={cls.id}
                      className="bg-white rounded-[6px] border border-[#DDD8CC] p-4 sm:p-6 shadow-sm hover:shadow-md transition"
                    >
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-display font-bold text-md text-[#0D0F12] uppercase mb-1">
                            {cls.className}
                          </h3>
                          <p className="text-xs text-[#8B9E6A] font-semibold mb-2 line-clamp-2">
                            {cls.details}
                          </p>
                          <span className="text-xs text-gray-500 font-display font-bold uppercase tracking-wider flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            Added {formatDate(cls.createdAt)}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 w-full md:w-auto flex-shrink-0">
                          <button
                            onClick={() =>
                              window.open(cls.youtubeLink, "_blank")
                            }
                            className="btn-primary flex-1 md:flex-initial !text-[11px] md:!text-xs !py-2 !px-2.5 md:!py-2.5 md:!px-4 flex items-center justify-center gap-1 sm:gap-1.5 whitespace-nowrap"
                          >
                            <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
                            View Class →
                          </button>
                          {cls.notesUrl ? (
                            <a
                              href={cls.notesUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn-secondary flex-1 md:flex-initial !text-[11px] md:!text-xs !py-2 !px-2.5 md:!py-2.5 md:!px-4 flex items-center justify-center gap-1 sm:gap-1.5 whitespace-nowrap"
                            >
                              <FileText className="w-3.5 h-3.5 flex-shrink-0" />
                              Notes 📄
                            </a>
                          ) : (
                            <span className="flex-1 md:flex-initial text-center !text-[11px] md:!text-xs font-display font-bold uppercase tracking-wider text-gray-400 !px-2.5 !py-2 md:!px-4 md:!py-2.5 border border-gray-200 rounded bg-gray-50 cursor-not-allowed whitespace-nowrap">
                              No Notes
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </main>
  );
}
