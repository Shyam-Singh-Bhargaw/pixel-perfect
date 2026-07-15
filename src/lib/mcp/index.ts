import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listTasks from "./tools/list-tasks";
import createTask from "./tools/create-task";
import listRevisionItems from "./tools/list-revision-items";
import listStudyNotes from "./tools/list-study-notes";
import createStudyNote from "./tools/create-study-note";
import listJobApplications from "./tools/list-job-applications";

// Build the OAuth issuer from the project ref so the direct supabase.co host
// is used (the runtime SUPABASE_URL may be a .lovable.cloud proxy which mcp-js
// would reject as an issuer mismatch).
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "prepos-mcp",
  title: "PrepOS",
  version: "0.1.0",
  instructions:
    "Tools for PrepOS — a personal AI/ML interview prep dashboard. Use these to read and update the signed-in user's tasks, revision items, study notes, and job applications.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listTasks, createTask, listRevisionItems, listStudyNotes, createStudyNote, listJobApplications],
});
