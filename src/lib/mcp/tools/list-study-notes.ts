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
  name: "list_study_notes",
  title: "List study notes",
  description: "List the signed-in user's study notes, optionally filtered by category or search term in the title.",
  inputSchema: {
    category: z.string().optional(),
    search: z.string().optional().describe("Case-insensitive substring match on the title."),
    limit: z.number().int().min(1).max(200).optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ category, search, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    let q = sbForUser(ctx).from("study_notes").select("id,title,category,content,date,created_at").eq("user_id", ctx.getUserId()!).order("created_at", { ascending: false }).limit(limit ?? 30);
    if (category) q = q.eq("category", category);
    if (search) q = q.ilike("title", `%${search}%`);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return { content: [{ type: "text", text: JSON.stringify(data) }], structuredContent: { notes: data ?? [] } };
  },
});
