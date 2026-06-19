export async function sendSmsOtp(mobile: string, otp: string) {
  const authKey = process.env.MSG91_AUTH_KEY;
  const templateId = process.env.MSG91_TEMPLATE_ID;

  if (authKey && templateId) {
    try {
      const response = await fetch("https://control.msg91.com/api/v5/flow/", {
        method: "POST",
        headers: {
          "authkey": authKey,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          template_id: templateId,
          short_url: "0",
          recipients: [
            {
              mobiles: `91${mobile}`, // India country code prefix
              OTP: otp
            }
          ]
        })
      });

      const data = await response.json();
      if (data.type !== "success") {
        console.error("[SMS] MSG91 Response Error:", data);
        throw new Error(data.message || "Failed to send SMS OTP via MSG91");
      }

      console.log(`[SMS] OTP sent to ${mobile} successfully via MSG91`);
      return { success: true, provider: "msg91" };
    } catch (err: any) {
      console.error("[SMS] MSG91 send error:", err);
      throw err;
    }
  }

  // Development Fallback
  console.warn("=================================================");
  console.warn("⚠️ SMS NOT SENT: MSG91_AUTH_KEY or MSG91_TEMPLATE_ID not configured.");
  console.warn(`Mobile: ${mobile}`);
  console.warn(`OTP Code: ${otp}`);
  console.warn("=================================================");
  return { success: true, provider: "console", otp };
}

export async function getSmsBalance(): Promise<{ balance: number; enabled: boolean } | null> {
  const authKey = process.env.MSG91_AUTH_KEY;

  if (!authKey) {
    return { balance: 0, enabled: false };
  }

  try {
    const response = await fetch("https://control.msg91.com/api/v1/account", {
      method: "GET",
      headers: {
        "authkey": authKey
      }
    });

    if (!response.ok) {
      console.error("[SMS] MSG91 Balance API HTTP error:", response.status);
      return { balance: 0, enabled: true };
    }

    const data = await response.json();
    
    // The balance is typically returned as cash_credits in MSG91 accounts API
    const cashCredits = data.cash_credits || 0;
    const balance = typeof cashCredits === "string" ? parseFloat(cashCredits) : cashCredits;

    return { balance, enabled: true };
  } catch (err) {
    console.error("[SMS] Failed to fetch MSG91 balance:", err);
    return { balance: 0, enabled: true };
  }
}
