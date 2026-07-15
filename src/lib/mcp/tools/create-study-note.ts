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
  name: "create_study_note",
  title: "Create study note",
  description: "Create a study note for the signed-in user (markdown content supported).",
  inputSchema: {
    title: z.string().min(1),
    content: z.string().min(1).describe("Markdown-supported body of the note."),
    category: z.string().optional(),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  handler: async ({ title, content, category }, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const today = new Date().toISOString().slice(0, 10);
    const { data, error } = await sbForUser(ctx).from("study_notes").insert({
      user_id: ctx.getUserId()!,
      title, content, category: category ?? null, date: today,
    }).select().single();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return { content: [{ type: "text", text: `Created note ${data.id}` }], structuredContent: { note: data } };
  },
});
