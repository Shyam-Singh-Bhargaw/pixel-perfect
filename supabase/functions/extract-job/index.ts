import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function decodeEntities(s: string) {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#x27;/g, "'");
}

function stripTags(s: string) {
  return decodeEntities(s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
}

function inferCompanyFromDomain(host: string) {
  const h = host.replace(/^www\./, "");
  const parts = h.split(".");
  // Workday-style: company.wd5.myworkdayjobs.com
  if (h.includes("myworkdayjobs.com") && parts.length > 2) {
    return parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
  }
  // greenhouse: boards.greenhouse.io/company/jobs/...
  // lever: jobs.lever.co/company/...
  // ashby: jobs.ashbyhq.com/company/...
  const generic = ["linkedin", "indeed", "glassdoor", "naukri", "monster", "ziprecruiter", "google", "lever", "greenhouse", "ashbyhq", "workday", "myworkdayjobs"];
  const candidate = parts[parts.length - 2] || parts[0];
  if (generic.includes(candidate)) return "";
  return candidate.charAt(0).toUpperCase() + candidate.slice(1);
}

function pickFromPath(url: URL): string {
  // greenhouse: /<company>/jobs/<id>
  // lever: /<company>/<id>
  // ashby: /<company>/<id>
  const segs = url.pathname.split("/").filter(Boolean);
  const host = url.hostname;
  if (host.includes("greenhouse.io") || host.includes("lever.co") || host.includes("ashbyhq.com")) {
    if (segs[0]) return segs[0].charAt(0).toUpperCase() + segs[0].slice(1);
  }
  return "";
}

function extractMeta(html: string, name: string): string {
  const patterns = [
    new RegExp(`<meta[^>]+property=["']${name}["'][^>]+content=["']([^"']+)["']`, "i"),
    new RegExp(`<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']+)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${name}["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${name}["']`, "i"),
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m && m[1]) return decodeEntities(m[1]).trim();
  }
  return "";
}

function extractJsonLd(html: string): any | null {
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    try {
      const parsed = JSON.parse(m[1].trim());
      const arr = Array.isArray(parsed) ? parsed : [parsed];
      for (const item of arr) {
        const t = item["@type"];
        if (t === "JobPosting" || (Array.isArray(t) && t.includes("JobPosting"))) return item;
        if (item["@graph"]) {
          for (const g of item["@graph"]) {
            if (g["@type"] === "JobPosting") return g;
          }
        }
      }
    } catch {
      /* ignore */
    }
  }
  return null;
}

function detectJobType(text: string): string {
  const t = text.toLowerCase();
  if (/\bintern(ship)?\b/.test(t)) return "Internship";
  if (/\bcontract(or)?\b|\bcontract\s*-?\s*to\s*-?\s*hire\b/.test(t)) return "Contract";
  if (/\bpart[\s-]?time\b/.test(t)) return "Part-time";
  if (/\bfull[\s-]?time\b/.test(t)) return "Full-time";
  return "";
}

function detectLocation(text: string): string {
  const t = text.toLowerCase();
  if (/\bremote\b/.test(t) && /\bhybrid\b/.test(t)) return "Hybrid";
  if (/\bhybrid\b/.test(t)) return "Hybrid";
  if (/\bremote\b/.test(t)) return "Remote";
  if (/\bon[\s-]?site\b/.test(t) || /\bin[\s-]?office\b/.test(t)) return "Onsite";
  return "";
}

function detectSalary(text: string): string {
  // $120,000 - $150,000  | ₹15-20 LPA | €60k - €80k
  const patterns = [
    /(?:\$|usd\s?)\s?\d{2,3}[,.]?\d{3}\s?[-–to]+\s?\$?\s?\d{2,3}[,.]?\d{3}/i,
    /₹\s?\d{1,3}\s?[-–to]+\s?₹?\s?\d{1,3}\s?(?:lpa|lakhs?|l)/i,
    /€\s?\d{2,3}[,.]?\d{0,3}\s?[-–to]+\s?€?\s?\d{2,3}[,.]?\d{0,3}/i,
    /£\s?\d{2,3}[,.]?\d{0,3}\s?[-–to]+\s?£?\s?\d{2,3}[,.]?\d{0,3}/i,
    /\$\s?\d{2,3}\s?k\s?[-–to]+\s?\$?\s?\d{2,3}\s?k/i,
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (m) return m[0].trim();
  }
  return "";
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

    const result: Record<string, string> = {
      company: "",
      role: "",
      location: "",
      job_type: "",
      salary: "",
    };

    // Fallbacks based on URL alone
    result.company = pickFromPath(parsedUrl) || inferCompanyFromDomain(parsedUrl.hostname);

    let html = "";
    try {
      const resp = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; PrepOSBot/1.0; +https://prepos.app) AppleWebKit/537.36",
          Accept: "text/html,application/xhtml+xml",
        },
        redirect: "follow",
      });
      if (resp.ok) {
        html = await resp.text();
      }
    } catch (e) {
      console.warn("fetch failed", e);
    }

    if (html) {
      const jsonLd = extractJsonLd(html);
      if (jsonLd) {
        if (jsonLd.title) result.role = String(jsonLd.title);
        const org = jsonLd.hiringOrganization;
        if (org) result.company = (typeof org === "string" ? org : org.name) || result.company;
        const loc = jsonLd.jobLocation;
        if (loc) {
          const l = Array.isArray(loc) ? loc[0] : loc;
          const addr = l?.address || {};
          const city = addr.addressLocality || "";
          const region = addr.addressRegion || "";
          const country = addr.addressCountry || "";
          result.location = [city, region, country].filter(Boolean).join(", ");
        }
        if (jsonLd.jobLocationType === "TELECOMMUTE") result.location = "Remote";
        if (jsonLd.employmentType) {
          const et = String(jsonLd.employmentType).toLowerCase();
          if (et.includes("intern")) result.job_type = "Internship";
          else if (et.includes("contract")) result.job_type = "Contract";
          else if (et.includes("part")) result.job_type = "Part-time";
          else if (et.includes("full")) result.job_type = "Full-time";
        }
        const bs = jsonLd.baseSalary;
        if (bs?.value) {
          const v = bs.value;
          if (v.minValue && v.maxValue) {
            result.salary = `${bs.currency || ""} ${v.minValue}-${v.maxValue} ${v.unitText || ""}`.trim();
          } else if (v.value) {
            result.salary = `${bs.currency || ""} ${v.value} ${v.unitText || ""}`.trim();
          }
        }
      }

      // Meta fallbacks
      if (!result.role) {
        const ogTitle = extractMeta(html, "og:title") || extractMeta(html, "twitter:title");
        if (ogTitle) result.role = ogTitle;
      }
      if (!result.role) {
        const titleM = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
        if (titleM) result.role = decodeEntities(titleM[1]).trim();
      }
      // Try splitting "Role at Company" / "Role | Company"
      if (result.role) {
        const sep = result.role.match(/^(.+?)\s+(?:at|@|\||–|-|·|—)\s+(.+)$/i);
        if (sep) {
          result.role = sep[1].trim();
          if (!result.company || result.company.length < 2) result.company = sep[2].trim();
        }
      }
      if (!result.company) {
        const ogSite = extractMeta(html, "og:site_name");
        if (ogSite) result.company = ogSite;
      }

      const text = stripTags(html).slice(0, 8000);
      if (!result.location) result.location = detectLocation(text);
      if (!result.job_type) result.job_type = detectJobType(text);
      if (!result.salary) result.salary = detectSalary(text);
    }

    // Clean up role
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
