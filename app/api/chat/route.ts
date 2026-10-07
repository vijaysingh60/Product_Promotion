import { NextResponse, type NextRequest } from "next/server";
import { answerQuestion } from "@/lib/chatbot";
import { getData } from "@/lib/db";
import { buildPlanFor } from "@/lib/plan";
import { getConfig } from "@/lib/serverConfig";

// POST { message } → { answer, links }. Reads the same live plan as the dashboard.
export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as { message?: unknown } | null;
  const message = typeof body?.message === "string" ? body.message.slice(0, 300) : "";
  if (!message.trim()) return NextResponse.json({ error: "Empty message" }, { status: 400 });

  const config = await getConfig();
  const { data } = await getData();
  return NextResponse.json(answerQuestion(message, buildPlanFor(config, data), data));
}
