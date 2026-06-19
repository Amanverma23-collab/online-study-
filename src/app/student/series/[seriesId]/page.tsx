"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Star, ArrowLeft, Award, CheckCircle, Package, IndianRupee, ShieldAlert, ChevronRight, Play } from "lucide-react";
import Link from "next/link";
import Script from "next/script";

interface SeriesTestConfig {
  id: string;
  title: string;
  subject: string;
  order: number;
}

interface SeriesDetails {
  id: string;
  title: string;
  description: string;
  price: number;
  batch: string[];
  subjects: string[];
  tests: SeriesTestConfig[];
}

declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function SeriesDetailPage({ params }: { params: { seriesId: string } }) {
  const seriesId = params.seriesId;
  const router = useRouter();
  
  const [studentId, setStudentId] = useState<string | null>(null);
  const [studentName, setStudentName] = useState("");
  const [series, setSeries] = useState<SeriesDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPurchased, setIsPurchased] = useState(false);
  const [checkingPurchase, setCheckingPurchase] = useState(true);
  const [purchasedTestsAttemptStatus, setPurchasedTestsAttemptStatus] = useState<any[]>([]);
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    const sId = localStorage.getItem("studentId");
    const sName = localStorage.getItem("studentName");
    if (!sId || !sName) {
      router.push("/");
      return;
    }
    setStudentId(sId);
    setStudentName(sName);
    fetchSeriesDetails();
    checkPurchaseStatus(sId);
  }, [seriesId]);

  const fetchSeriesDetails = async () => {
    try {
      const res = await fetch(`/api/series/${seriesId}`);
      if (res.ok) {
        const data = await res.json();
        setSeries(data);
      } else {
        alert("Failed to load test series details.");
        router.push("/student/dashboard");
      }
    } catch (err) {
      console.error("Failed to fetch series details:", err);
      router.push("/student/dashboard");
    } finally {
      setLoading(false);
    }
  };

  const checkPurchaseStatus = async (sId: string) => {
    try {
      // We check access by hitting the tests API which checks purchase status internally
      const res = await fetch(`/api/series/${seriesId}/tests?studentId=${sId}`);
      if (res.ok) {
        setIsPurchased(true);
        const testsWithStatus = await res.json();
        setPurchasedTestsAttemptStatus(testsWithStatus);
      } else if (res.status === 403) {
        setIsPurchased(false);
      }
    } catch (err) {
      console.error("Failed to check purchase status:", err);
    } finally {
      setCheckingPurchase(false);
    }
  };

  const handleBuyNow = async () => {
    if (!studentId || !series) return;
    setPaying(true);
    try {
      const res = await fetch("/api/payments/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId, testSeriesId: seriesId })
      });
      const data = await res.json();
      
      if (!res.ok || !data.success) {
        alert(data.error || "Failed to access test series. Please try again.");
        setPaying(false);
        return;
      }

      if (data.directAccess) {
        alert("🎉 Access Granted! Welcome to the test series.");
        setIsPurchased(true);
        checkPurchaseStatus(studentId);
        setPaying(false);
        return;
      }

      const options = {
        key: data.keyId,
        amount: data.amount,
        currency: data.currency,
        name: "Officers Saga",
        description: `Test Series: ${series.title}`,
        order_id: data.orderId,
        // Restrict payment methods to UPI only per prompt specification
        method: { upi: true, card: false, netbanking: false, wallet: false },
        config: {
          display: {
            blocks: {
              upi: { name: "Pay via UPI", instruments: [{ method: "upi" }] }
            },
            sequence: ["block.upi"],
            preferences: { show_default_blocks: false }
          }
        },
        handler: async (response: any) => {
          try {
            const verifyRes = await fetch("/api/payments/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                studentId,
                testSeriesId: seriesId
              })
            });
            const verifyData = await verifyRes.json();
            if (verifyRes.ok && verifyData.success) {
              alert("🎉 Purchase successful! Welcome to the test series.");
              setIsPurchased(true);
              checkPurchaseStatus(studentId);
            } else {
              alert("Payment verification failed. Please contact coaching support.");
            }
          } catch (err) {
            console.error("Verification failed:", err);
            alert("An error occurred during payment verification.");
          } finally {
            setPaying(false);
          }
        },
        prefill: {
          name: studentName,
          contact: localStorage.getItem("studentMobile") || ""
        },
        theme: { color: "#C9A84C" },
        modal: {
          ondismiss: () => {
            setPaying(false);
          }
        }
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (err) {
      console.error("Payment setup failure:", err);
      alert("Failed to connect to payment gateways.");
      setPaying(false);
    }
  };

  if (loading || checkingPurchase) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F3EC]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#C9A84C]"></div>
      </div>
    );
  }

  if (!series) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F3EC] text-[#D94F3D] font-body">
        <ShieldAlert className="w-12 h-12 mx-auto mb-4" />
        <p>Series parameters not found.</p>
      </div>
    );
  }

  const hasStarted = purchasedTestsAttemptStatus.some((t) => t.status === "completed" || t.attemptId !== null);

  return (
    <>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
      <div className="h-screen overflow-hidden bg-[#F5F3EC] flex flex-col text-[#0D0F12] font-body">
        {/* Top Navbar */}
        <header className="sticky top-0 z-50 bg-[#0D0F12] py-4 px-6 md:px-12 text-[#EEF0E8] shadow flex justify-between items-center border-b border-[#2E3B1E] flex-shrink-0">
          <div className="flex items-center gap-3">
            <Link href="/student/dashboard" className="p-1 border border-[#2E3B1E] bg-[#1C2415] rounded hover:bg-[#2E3B1E] transition">
              <ArrowLeft className="w-4 h-4 text-[#C9A84C]" />
            </Link>
            <div>
              <h1 className="font-display font-bold text-md tracking-wider uppercase">Officers Saga</h1>
              <span className="text-[10px] text-[#8B9E6A] font-display font-semibold uppercase tracking-widest leading-none">Briefing Details</span>
            </div>
          </div>
        </header>

        <main className="flex-1 max-w-4xl mx-auto w-full px-6 py-10 space-y-8 overflow-y-auto no-scrollbar">
          <div className="bg-white rounded-[6px] border border-[#DDD8CC] shadow-sm overflow-hidden">
            {/* Header banner */}
            <div className="bg-[#0D0F12] p-8 text-[#EEF0E8] border-b border-[#2E3B1E]">
              <div className="flex flex-wrap gap-2 mb-4">
                {series.batch.map((b) => (
                  <span key={b} className="bg-[#C9A84C]/10 border border-[#C9A84C]/25 text-[#C9A84C] px-2.5 py-0.5 rounded text-[10px] font-display font-bold uppercase tracking-wider">
                    {b}
                  </span>
                ))}
              </div>
              <h2 className="font-display font-bold text-2xl uppercase tracking-wider text-[#C9A84C]">{series.title}</h2>
              <p className="text-xs text-[#8B9E6A] font-semibold mt-2 max-w-xl leading-relaxed">{series.description}</p>
            </div>

            {/* Content info */}
            <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Left & Middle: Details */}
              <div className="md:col-span-2 space-y-6">
                <div>
                  <h4 className="font-display font-bold text-sm uppercase tracking-wider text-[#0D0F12] border-b border-[#DDD8CC] pb-2 mb-3">
                    What's included in this Series
                  </h4>
                  <ul className="space-y-2.5 text-xs text-gray-700 font-semibold">
                    {series.subjects.map((sub) => (
                      <li key={sub} className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-[#4A7C59] flex-shrink-0" />
                        <span>{sub} Tests compilation pack</span>
                      </li>
                    ))}
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-[#4A7C59] flex-shrink-0" />
                      <span>{series.tests.length} Subject-wise mock briefings</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-[#4A7C59] flex-shrink-0" />
                      <span>Sequential unlocking & performance review tracking</span>
                    </li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-display font-bold text-sm uppercase tracking-wider text-[#0D0F12] border-b border-[#DDD8CC] pb-2 mb-3">
                    Briefing Outline & Syllabus
                  </h4>
                  <div className="space-y-2">
                    {series.tests.map((test) => (
                      <div key={test.id} className="flex justify-between items-center bg-gray-50 border border-gray-200 px-4 py-2.5 rounded text-xs font-semibold text-gray-700">
                        <div className="flex items-center gap-2">
                          <Package className="w-4 h-4 text-[#C9A84C] flex-shrink-0" />
                          <span className="font-bold">{test.title}</span>
                        </div>
                        <span className="bg-gray-200 text-gray-600 px-2 py-0.5 rounded text-[10px] uppercase font-display font-bold">
                          {test.subject}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right: Pricing & Enrollment Action */}
              <div className="bg-[#F5F3EC] border border-[#DDD8CC] rounded-[6px] p-6 flex flex-col justify-between text-center min-h-[220px]">
                {isPurchased ? (
                  <div className="my-auto space-y-4">
                    <div className="w-12 h-12 bg-[#4A7C59]/10 border border-[#4A7C59]/25 text-[#4A7C59] rounded-full flex items-center justify-center mx-auto shadow-sm">
                      <CheckCircle className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="font-display font-bold text-[#4A7C59] uppercase text-xs tracking-wider">Access Granted</h4>
                      <p className="text-[10px] text-[#8B9E6A] font-semibold mt-0.5">✅ You're enrolled in this series</p>
                    </div>
                    <Link
                      href={`/student/series/${seriesId}/tests`}
                      className="w-full bg-[#4A7C59] hover:bg-[#4A7C59]/90 text-white font-display font-bold uppercase tracking-wider text-xs py-3 rounded transition flex items-center justify-center gap-1.5 shadow"
                    >
                      <Play className="w-4 h-4 fill-current" /> {hasStarted ? "Continue Test Series" : "Start Test Series"} &rarr;
                    </Link>
                  </div>
                ) : (
                  <div className="my-auto space-y-4">
                    <div>
                      <span className="text-[10px] text-[#8B9E6A] font-display font-bold uppercase tracking-widest">Enrollment Fee</span>
                      <h3 className="font-display font-bold text-3xl text-[#0D0F12] mt-1 flex items-center justify-center gap-0.5">
                        <IndianRupee className="w-6 h-6 text-[#C9A84C] stroke-[2.5px]" /> {series.price}
                      </h3>
                      <p className="text-[10px] text-[#8B9E6A] font-semibold mt-1">One-time purchase, lifetime access</p>
                    </div>
                    <button
                      onClick={handleBuyNow}
                      disabled={paying}
                      className="w-full bg-[#C9A84C] hover:bg-[#C9A84C]/90 disabled:bg-[#C9A84C]/50 text-[#0D0F12] font-display font-bold uppercase tracking-wider text-xs py-3 rounded transition flex items-center justify-center gap-1.5 shadow"
                    >
                      <IndianRupee className="w-4 h-4" /> {paying ? "Processing UPI..." : "Buy Now"}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
