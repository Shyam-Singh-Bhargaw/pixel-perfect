import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function inferCompanyFromDomain(host: string): string {
  const h = host.replace(/^www\./, "");
  const parts = h.split(".");
  if (h.includes("myworkdayjobs.com") && parts.length > 2) {
    return parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
  }
  const generic = [
    "linkedin", "indeed", "glassdoor", "naukri", "monster", "ziprecruiter",
    "google", "lever", "greenhouse", "ashbyhq", "workday", "myworkdayjobs",
    "wellfound", "angel", "ycombinator", "hn",
  ];
  const candidate = parts[parts.length - 2] || parts[0];
  if (generic.includes(candidate)) return "";
  return candidate.charAt(0).toUpperCase() + candidate.slice(1);
}

function pickFromPath(url: URL): string {
  const segs = url.pathname.split("/").filter(Boolean);
  const host = url.hostname;
  if (host.includes("greenhouse.io") || host.includes("lever.co") || host.includes("ashbyhq.com")) {
    if (segs[0]) return segs[0].charAt(0).toUpperCase() + segs[0].slice(1);
  }
  return "";
}

interface JobData {
  company: string;
  role: string;
  location: string;
  job_type: string;
  salary: string;
}

async function scrapeWithFirecrawl(url: string, apiKey: string): Promise<{ markdown?: string; metadata?: any } | null> {
  try {
    const resp = await fetch("https://api.firecrawl.dev/v2/scrape", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url,
        formats: ["markdown"],
        onlyMainContent: true,
        waitFor: 1500,
      }),
    });
    const data = await resp.json();
    if (!resp.ok) {
      console.error("Firecrawl error:", resp.status, data);
      return null;
    }
    // v2 returns { success, data: { markdown, metadata } }
    const payload = data?.data || data;
    return { markdown: payload?.markdown, metadata: payload?.metadata };
  } catch (e) {
    console.error("Firecrawl exception:", e);
    return null;
  }
}

async function extractWithAI(markdown: string, sourceUrl: string, lovableKey: string): Promise<Partial<JobData> | null> {
  const trimmed = markdown.slice(0, 6000);
  try {
    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content:
              "Extract structured job posting data from scraped content. Return ONLY clean values — no extra commentary. If a field is genuinely missing, return an empty string.",
          },
          {
            role: "user",
            content: `Source URL: ${sourceUrl}\n\nContent:\n${trimmed}`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "set_job_fields",
              description: "Return the extracted job fields",
              parameters: {
                type: "object",
                properties: {
                  company: { type: "string", description: "Hiring company name only, no suffix like 'Careers' or 'Jobs'" },
                  role: { type: "string", description: "Job title only, no company name attached" },
                  location: { type: "string", description: "City, state, country, or 'Remote' / 'Hybrid' / 'Onsite'" },
                  job_type: { type: "string", description: "One of: Full-time, Part-time, Contract, Internship, or empty" },
                  salary: { type: "string", description: "Salary range as displayed, e.g. '$120k - $150k' or empty" },
                },
                required: ["company", "role", "location", "job_type", "salary"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "set_job_fields" } },
      }),
    });

    if (!resp.ok) {
      const text = await resp.text();
      console.error("AI gateway error:", resp.status, text);
      return null;
    }
    const data = await resp.json();
    const toolCall = data?.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) return null;
    const parsed = JSON.parse(toolCall.function.arguments);
    return parsed as Partial<JobData>;
  } catch (e) {
    console.error("AI extraction exception:", e);
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { url } = await req.json();
    if (!url || typeof url !== "string") {
      return new Response(JSON.stringify({ error: "Missing url" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      return new Response(JSON.stringify({ error: "Invalid url" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result: JobData = {
      company: "",
      role: "",
      location: "",
      job_type: "",
      salary: "",
    };

    // URL-based fallback
    result.company = pickFromPath(parsedUrl) || inferCompanyFromDomain(parsedUrl.hostname);

    const firecrawlKey = Deno.env.get("FIRECRAWL_API_KEY");
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");

    if (!firecrawlKey) {
      console.warn("FIRECRAWL_API_KEY not set — returning URL-only fallback");
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const scraped = await scrapeWithFirecrawl(url, firecrawlKey);

    if (scraped?.markdown && lovableKey) {
      const ai = await extractWithAI(scraped.markdown, url, lovableKey);
      if (ai) {
        if (ai.company) result.company = ai.company;
        if (ai.role) result.role = ai.role;
        if (ai.location) result.location = ai.location;
        if (ai.job_type) result.job_type = ai.job_type;
        if (ai.salary) result.salary = ai.salary;
      }
    }

    // Use page metadata as additional fallback for role/company
    if (scraped?.metadata) {
      const md = scraped.metadata;
      if (!result.role && md.title) {
        let title = String(md.title).trim();
        const sep = title.match(/^(.+?)\s+(?:at|@|\||–|-|·|—)\s+(.+)$/i);
        if (sep) {
          result.role = sep[1].trim();
          if (!result.company) result.company = sep[2].trim();
        } else {
          result.role = title;
        }
      }
      if (!result.company && md.ogSiteName) result.company = String(md.ogSiteName).trim();
    }

    // Clean up
    if (result.role) {
      result.role = result.role
        .replace(/\s*[-|·–—]\s*(LinkedIn|Indeed|Glassdoor|Greenhouse|Lever|Ashby|Workday).*$/i, "")
        .replace(/\s+\|\s+.*Careers.*$/i, "")
        .trim();
    }
    if (result.company) {
      result.company = result.company.replace(/\s*\|\s*Careers.*$/i, "").trim();
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("extract-job error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
