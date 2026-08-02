// api/subscribe.js
// Vercel serverless function. Runs on the server, so no CORS and no exposed API key.

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { email } = req.body || {};

  if (!email || !email.includes("@")) {
    return res.status(400).json({ error: "Invalid email" });
  }

  const API_KEY = process.env.KIT_API_KEY;
  const FORM_ID = process.env.KIT_FORM_ID;

  if (!API_KEY || !FORM_ID) {
    return res.status(500).json({ error: "Server is missing KIT_API_KEY or KIT_FORM_ID" });
  }

  try {
    const kitRes = await fetch(
      `https://api.convertkit.com/v3/forms/${FORM_ID}/subscribe`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ api_key: API_KEY, email }),
      }
    );

    const data = await kitRes.json();

    if (!kitRes.ok) {
      // Pass Kit's actual error through so it shows in the Vercel logs
      return res.status(kitRes.status).json({
        error: data.message || "Kit rejected the request",
        kitResponse: data,
      });
    }

    return res.status(200).json({ ok: true, state: data.subscription?.state });
  } catch (err) {
    return res.status(500).json({ error: "Request to Kit failed", detail: String(err) });
  }
}
