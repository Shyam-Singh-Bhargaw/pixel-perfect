import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are a strict but encouraging teacher. The student is preparing for AI/ML and SDE interviews. Evaluate their answer like a senior interviewer would. Be specific, honest, and constructive. Never just say 'good job' — always push deeper.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { topic, concept, question, answer } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const userPrompt = `Topic: ${topic || "General"}
Concept / Note:
${concept || "(none provided)"}

Interview Question:
${question}

Student's Answer:
${answer}

Evaluate the answer and return STRICT markdown with these exact section headers (use ## for each):
## Score
A single line: \`X/10\` where X is an integer 0-10.
## What you got right
- bullet points
## What was missing or wrong
- bullet points
## The ideal answer
A clean, complete model answer in flowing prose or bullets.
## Follow-up question
One follow-up question to deepen understanding.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Please try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Credits exhausted. Please add funds." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content || "";

    // Parse score
    const scoreMatch = content.match(/##\s*Score\s*\n+\s*`?(\d{1,2})\s*\/\s*10/i);
    const score = scoreMatch ? Math.min(10, parseInt(scoreMatch[1], 10)) : null;

    return new Response(JSON.stringify({ markdown: content, score }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("evaluate-answer error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
