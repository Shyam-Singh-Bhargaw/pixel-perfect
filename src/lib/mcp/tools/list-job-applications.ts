import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

function sbForUser(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "list_job_applications",
  title: "List job applications",
  description: "List the signed-in user's tracked job applications, optionally filtered by status or company.",
  inputSchema: {
    status: z.string().optional(),
    company: z.string().optional(),
    limit: z.number().int().min(1).max(200).optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ status, company, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    let q = sbForUser(ctx).from("job_applications")
      .select("id,company,role,status,stage,applied_date,follow_up_date,location,salary,url")
      .eq("user_id", ctx.getUserId()!).order("applied_date", { ascending: false }).limit(limit ?? 50);
    if (status) q = q.eq("status", status);
    if (company) q = q.ilike("company", `%${company}%`);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return { content: [{ type: "text", text: JSON.stringify(data) }], structuredContent: { applications: data ?? [] } };
  },
});
