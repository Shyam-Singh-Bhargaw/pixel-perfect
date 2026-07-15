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
  name: "list_tasks",
  title: "List tasks",
  description: "List the signed-in user's PrepOS tasks, optionally filtered by date (YYYY-MM-DD) and done status.",
  inputSchema: {
    date: z.string().optional().describe("Optional date filter in YYYY-MM-DD format."),
    done: z.boolean().optional().describe("Optional filter for completion status."),
    limit: z.number().int().min(1).max(200).optional().describe("Max rows to return (default 50)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ date, done, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    let q = sbForUser(ctx).from("tasks").select("id,text,date,done,priority,created_at").eq("user_id", ctx.getUserId()!).order("created_at", { ascending: false }).limit(limit ?? 50);
    if (date) q = q.eq("date", date);
    if (typeof done === "boolean") q = q.eq("done", done);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return { content: [{ type: "text", text: JSON.stringify(data) }], structuredContent: { tasks: data ?? [] } };
  },
});
