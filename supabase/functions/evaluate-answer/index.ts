import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are a strict but deeply encouraging senior interviewer and teacher. The student is preparing for AI/ML and SDE interviews. Evaluate their answer honestly and precisely. Never just say 'good job' — always push deeper. Return your evaluation using EXACTLY this markdown structure with EXACTLY these section headers:

## Score: X/10

## ✓ What you got right
- bullet point
- bullet point

## ✗ What was missing or wrong
- bullet point
- bullet point

## ★ The ideal answer

Write the ideal answer like a top 1% teacher — NOT a textbook. Structure it as:

**1. The Core Concept (Why)**
2-3 sentences explaining the intuition first.

**2. Concrete Example with Real Data**
First: a markdown table with 5-6 rows of realistic sample data (relevant to the topic).
Then: the query or code in a fenced code block with the correct language tag (e.g. \`\`\`sql or \`\`\`python).
Then: the expected output as another markdown table.

**3. Case Comparison**
Case 1 — The Inefficient Approach:
Show the query/code in a fenced code block. Below it, explain step by step what the database engine or runtime is doing and why it is slow.
Case 2 — The Efficient Approach:
Show the query/code in a fenced code block. Below it, explain step by step what the engine does and why it is faster.

**4. Complexity Comparison**

| Approach | Time Complexity | Table Scans | Memory Usage |
|---|---|---|---|

(fill in 2 rows)

**5. The Takeaway**
**One bold sentence that a senior engineer would say in an interview.**

## → Follow-up question

One specific, harder follow-up question the interviewer would now ask — something that tests deeper understanding.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { topic, noteContent, question, userAnswer } = await req.json();
    if (!userAnswer || !question) {
      return new Response(JSON.stringify({ error: "Missing question or userAnswer" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const userMsg = `Topic: ${topic || ""}

Study notes the student used:
${noteContent || ""}

Question asked:
${question}

Student's answer:
${userAnswer}

Evaluate the student's answer using the exact structure above.`;

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userMsg },
        ],
      }),
    });

    if (!resp.ok) {
      if (resp.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (resp.status === 402) {
        return new Response(JSON.stringify({ error: "Credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await resp.text();
      console.error("AI gateway error:", resp.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const json = await resp.json();
    const evaluation = json?.choices?.[0]?.message?.content || "";

    return new Response(JSON.stringify({ evaluation }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("evaluate-answer error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
