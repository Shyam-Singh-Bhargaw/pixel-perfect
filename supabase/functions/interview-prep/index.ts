import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { mode, company, role, raw_description, skills, interview_focus } = await req.json();
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableKey) {
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const isTips = mode === "tips";
    const jdContext = (raw_description || "").slice(0, 8000);
    const skillsLine = Array.isArray(skills) && skills.length ? `Required skills: ${skills.join(", ")}.` : "";
    const focusLine = Array.isArray(interview_focus) && interview_focus.length ? `Interview focus areas: ${interview_focus.join(", ")}.` : "";

    const systemPrompt = isTips
      ? "You are an elite interview coach. Generate exactly 5 razor-sharp, actionable prep tips tailored to this specific job. Each tip must reference something concrete from the JD (skill, tech, responsibility) — no generic fluff. One sentence each."
      : "You are a senior tech interviewer. Generate exactly 10 highly specific interview questions tailored to this exact role and JD. Mix technical, system-design, behavioral, and role-specific scenarios. No generic LeetCode prompts — every question should be answerable only with knowledge of this role.";

    const userPrompt = `Company: ${company || "Unknown"}
Role: ${role || "Unknown"}
${skillsLine}
${focusLine}

Job description:
${jdContext}`;

    const toolName = isTips ? "return_tips" : "return_questions";
    const itemKey = isTips ? "tips" : "questions";
    const minItems = isTips ? 5 : 10;
    const maxItems = isTips ? 5 : 10;

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: toolName,
              description: isTips ? "Return prep tips" : "Return interview questions",
              parameters: {
                type: "object",
                properties: {
                  [itemKey]: {
                    type: "array",
                    items: { type: "string" },
                    minItems,
                    maxItems,
                  },
                },
                required: [itemKey],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: toolName } },
      }),
    });

    if (!resp.ok) {
      if (resp.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Please wait a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (resp.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const text = await resp.text();
      console.error("AI gateway error:", resp.status, text);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await resp.json();
    const toolCall = data?.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      return new Response(JSON.stringify({ [itemKey]: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const parsed = JSON.parse(toolCall.function.arguments);
    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("interview-prep error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
