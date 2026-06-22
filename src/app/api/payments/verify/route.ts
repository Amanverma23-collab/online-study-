import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import crypto from "crypto";
import { createNotification } from "@/lib/notifications";

export async function POST(req: Request) {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, studentId, testSeriesId } = await req.json();

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !studentId || !testSeriesId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || "")
      .update(body)
      .digest("hex");

    const isValid = expectedSignature === razorpay_signature;

    const purchase = await db.seriesPurchase.findFirst({
      where: { razorpayOrderId: razorpay_order_id, studentId, seriesId: testSeriesId }
    });

    if (!purchase) {
      return NextResponse.json({ error: "Purchase record not found" }, { status: 404 });
    }

    await db.seriesPurchase.update({
      where: { id: purchase.id },
      data: {
        razorpayPaymentId: razorpay_payment_id,
        status: isValid ? "success" : "failed"
      }
    });

    if (isValid) {
      try {
        await createNotification({
          recipientType: "STUDENT",
          recipientId: studentId,
          type: "PURCHASE_SUCCESS",
          title: "Payment successful!",
          message: `You now have access to the test series.`,
          link: `/student/series/${testSeriesId}`,
          batch: null
        });
      } catch (notifyError) {
        console.error("Non-critical: Failed to send payment notification:", notifyError);
      }
    }

    return NextResponse.json({ success: isValid, status: isValid ? "success" : "failed" });
  } catch (error: any) {
    console.error("Verify Payment Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
