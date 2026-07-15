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
  name: "create_task",
  title: "Create task",
  description: "Create a new PrepOS task for the signed-in user.",
  inputSchema: {
    text: z.string().min(1).describe("Task text."),
    date: z.string().optional().describe("Optional date (YYYY-MM-DD); defaults to today."),
    priority: z.enum(["low", "medium", "high"]).optional().describe("Optional priority."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  handler: async ({ text, date, priority }, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const today = new Date().toISOString().slice(0, 10);
    const { data, error } = await sbForUser(ctx).from("tasks").insert({
      user_id: ctx.getUserId()!,
      text,
      date: date ?? today,
      priority: priority ?? "medium",
      done: false,
    }).select().single();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return { content: [{ type: "text", text: `Created task ${data.id}` }], structuredContent: { task: data } };
  },
});
