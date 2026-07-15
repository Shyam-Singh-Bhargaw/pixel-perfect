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
  name: "list_revision_items",
  title: "List revision items",
  description: "List spaced-repetition revision items for the signed-in user. Optionally filter to items due on or before today.",
  inputSchema: {
    due_only: z.boolean().optional().describe("If true, only return items with next_rev on or before today."),
    topic: z.string().optional().describe("Optional topic filter."),
    limit: z.number().int().min(1).max(200).optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ due_only, topic, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const today = new Date().toISOString().slice(0, 10);
    let q = sbForUser(ctx).from("revision_items").select("id,text,topic,next_rev,rev_count,added_date").eq("user_id", ctx.getUserId()!).order("next_rev", { ascending: true }).limit(limit ?? 50);
    if (due_only) q = q.lte("next_rev", today);
    if (topic) q = q.eq("topic", topic);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return { content: [{ type: "text", text: JSON.stringify(data) }], structuredContent: { items: data ?? [] } };
  },
});
