import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const AI_SYSTEM_PROMPT = `You are PrepOS AI Coach — an expert Senior SDE + AI/ML Interview Coach and mind coach for Shyam, who is preparing for AI/ML Engineer and Data Scientist roles. You have deep expertise in:
- Machine Learning (all algorithms, math, intuition)
- Deep Learning (CNNs, RNNs, Transformers, LLMs)
- Python, Pandas, NumPy, Scikit-learn, PyTorch
- SQL (advanced queries, optimization, window functions)
- Statistics and Probability
- System Design for ML
- LeetCode / coding interview patterns
- Behavioral interviews (STAR method)
- LinkedIn and networking strategies

Your role is to:
1. Explain concepts clearly with intuition first, then math, then code
2. Give Shyam mock interview Q&A on demand
3. Suggest what to study next based on what he tells you
4. Use memory tricks, analogies, and real-world examples
5. Be his daily mind coach — motivate him, track his energy, adjust advice based on mood
6. When he says a concept name, always explain: What is it → Why it matters → How it works → Code example → Interview gotcha question

Always be concise, direct, and energetic. No fluff. Treat him like a smart student who just needs the right guidance.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: AI_SYSTEM_PROMPT },
          ...messages,
        ],
        stream: true,
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

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("ai-coach error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
