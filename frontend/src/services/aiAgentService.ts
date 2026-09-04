import type { AIAgentIntent, AIAgentLanguage, AgentMessage, ProposedAction, WorkspaceContext } from "@/types/aiAgent";

const outsideScope = /\b(weather|recipe|poem|translate|capital of|stock|crypto|code a|movie|news)\b/i;
const createTask = /\b(create|add|make|remind me|schedule)\b/i;
const completeTask = /\b(complete|finish|done with|mark .* done)\b/i;

export function detectIntent(input: string): AIAgentIntent {
  if (/plan (my )?(day|today)|daily plan/i.test(input)) return "DAILY_PLANNING";
  if (/progress|analy[sz]e|productive/i.test(input)) return "PRODUCTIVITY_ANALYSIS";
  if (/priority|what should.*next/i.test(input)) return "PRIORITY_SUGGESTION";
  if (/note|extract/i.test(input)) return "NOTE_EXTRACTION";
  if (/deadline|overdue|missed/i.test(input)) return "DEADLINE_REPLANNING";
  return "TASK_MANAGEMENT";
}

function replyForPlan(context: WorkspaceContext) {
  const open = context.tasks.filter((task) => task.status !== "completed");
  if (!open.length) return "Your workspace is clear. Add a task or tell me a goal and I’ll turn it into a focused plan.";
  const top = [...open].sort((a, b) => (b.priority === "urgent" ? 4 : b.priority === "high" ? 3 : 1) - (a.priority === "urgent" ? 4 : a.priority === "high" ? 3 : 1)).slice(0, 3);
  return `Today’s focused plan:\n${top.map((task, index) => `${index + 1}. ${task.name} — ${task.estMinutes || 60} min`).join("\n")}\n\nStart with the first item, then reassess your energy.`;
}

/** Frontend-safe adapter. Replace its deterministic response with a server API call later. */
export async function sendAgentMessage(input: string, context: WorkspaceContext, preference: AIAgentLanguage = "auto"): Promise<Omit<AgentMessage, "id" | "createdAt" | "role">> {
  await new Promise((resolve) => window.setTimeout(resolve, 520));
  const bn = preference === "bn" || (preference === "auto" && /[\u0980-\u09FF]/.test(input));
  if (outsideScope.test(input)) return { content: bn ? "আমি FocusForge-এর প্রোডাক্টিভিটি এজেন্ট। আমি আপনার কাজ, রুটিন, লক্ষ্য, নোট, পরিকল্পনা ও ডেডলাইন নিয়ে সাহায্য করতে পারি।" : "I’m FocusForge’s productivity agent, so I can help with your tasks, routines, goals, notes, planning, deadlines, and productivity." };
  if (/plan (my )?(day|today)|what should i do next|দিনের পরিকল্পনা|আজ.*পরিকল্পনা/i.test(input)) return { content: bn ? (context.tasks.length ? "আজকের জন্য আপনার সবচেয়ে গুরুত্বপূর্ণ অসম্পূর্ণ কাজ দিয়ে শুরু করুন, তারপর পরের দুইটি কাজের জন্য ছোট ফোকাস ব্লক রাখুন।" : "আপনার ওয়ার্কস্পেস এখন খালি। একটি কাজ বা লক্ষ্য লিখুন, আমি সেটিকে পরিকল্পনায় সাজিয়ে দেব।") : replyForPlan(context) };
  if (/progress|analy[sz]e/i.test(input)) return { content: `You have ${context.tasks.filter((task) => task.status !== "completed").length} active tasks and ${context.tasks.filter((task) => task.status === "completed").length} completed tasks. Keep your next block small and finishable.` };
  if (completeTask.test(input)) {
    const matching = context.tasks.find((task) => input.toLowerCase().includes(task.name.toLowerCase()));
    if (matching) return { content: "I found a task to complete. Review the proposed change before applying it.", proposal: [{ id: crypto.randomUUID(), type: "complete_task", title: `Complete ${matching.name}`, detail: "Status will change to completed.", payload: { taskId: matching.id } }] };
  }
  if (createTask.test(input)) {
    const title = input.replace(/^(create|add|make|schedule)\s+(a\s+)?(task\s+)?/i, "").trim() || "New task";
    const action: ProposedAction = { id: crypto.randomUUID(), type: "create_task", title: `Create “${title}”`, detail: "A new medium-priority task will be added to your workspace.", payload: { name: title, title, priority: "medium", category: "General", estMinutes: 60, status: "not_started", targetDate: new Date().toISOString().slice(0, 10), tier: "next" } };
    return { content: "I’ve prepared a task proposal. Nothing will change until you confirm it.", proposal: [action] };
  }
  return { content: bn ? "আমি আপনার কাজ, রুটিন, লক্ষ্য, নোট, ডেডলাইন এবং পরিকল্পনা গুছিয়ে দিতে পারি। যেমন বলুন: “আজকের পরিকল্পনা করো” বা “আমার পরের কাজ কী?”" : "I can help organize your tasks, routines, goals, notes, deadlines, and plans. Try “Plan my day”, “What should I do next?”, or “Create a task to review JavaScript tonight.”" };
}
