import { createServerFn } from "@tanstack/react-start";
import { generateText } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { IC_REWARDS } from "./garage-catalog";
import type { Lesson } from "./types";

const MCQSchema = z.object({
  stem: z.string().min(1),
  options: z.array(z.string().min(1)).min(3).max(4),
  correctIndex: z.number().int().min(0).max(3),
  correctExplanation: z.string().min(1),
  wrongExplanations: z.array(z.string()).default([]),
});

const LessonSchema = z.object({
  coreIdea: z.string().min(1),
  steps: z
    .array(
      z.object({
        title: z.string().min(1),
        explanation: z.string().min(1),
        question: MCQSchema,
      }),
    )
    .min(2)
    .max(5),
  practice: MCQSchema,
  summary: z.string().min(1),
});

function extractJson(text: string): unknown {
  let t = text.trim();
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) t = fence[1].trim();
  const first = t.indexOf("{");
  const last = t.lastIndexOf("}");
  if (first !== -1 && last !== -1) t = t.slice(first, last + 1);
  return JSON.parse(t);
}

const GetLessonInput = z.object({
  galaxyId: z.string().uuid(),
  starId: z.string().min(1),
});

/**
 * Returns a Brilliant-style interactive lesson for a star.
 * Caches the generated lesson in `lessons` so re-opens are instant and free.
 */
export const getOrGenerateLesson = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => GetLessonInput.parse(input))
  .handler(async ({ data, context }): Promise<Lesson> => {
    // Cached?
    const cached = await context.supabase
      .from("lessons")
      .select("content")
      .eq("galaxy_id", data.galaxyId)
      .eq("star_id", data.starId)
      .maybeSingle();
    if (cached.data?.content) {
      const parsed = LessonSchema.safeParse(cached.data.content);
      if (parsed.success) return parsed.data;
    }

    // Load galaxy/star for grounding
    const { data: gx } = await context.supabase
      .from("galaxies")
      .select("name, topic, stars")
      .eq("id", data.galaxyId)
      .maybeSingle();
    if (!gx) throw new Error("Galaxy not found");

    const stars = Array.isArray(gx.stars) ? (gx.stars as Array<Record<string, unknown>>) : [];
    const idx = stars.findIndex((s) => s.id === data.starId);
    if (idx === -1) throw new Error("Star not found in galaxy");
    const star = stars[idx];
    const prevTitles = stars
      .slice(0, idx)
      .map((s) => s.title as string)
      .filter(Boolean);

    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");
    const gateway = createLovableAiGatewayProvider(key);

    const { text } = await generateText({
      model: gateway("google/gemini-3-flash-preview"),
      system: [
        "You are Nova, the lesson author for Constellation — a Brilliant-style learning platform.",
        "Author ONE interactive lesson for a single star. Respond with ONE JSON object, no markdown, no commentary.",
        "",
        "JSON shape:",
        "{",
        '  "coreIdea": string,              // 3-5 lines, intuitive, no textbook language',
        '  "steps": [                        // 3-4 guided steps, each teaching ONE small idea',
        "    {",
        '      "title": string,',
        '      "explanation": string,        // 2-5 sentences teaching ONE idea',
        '      "question": {                 // a thinking MCQ at the END of the step',
        '        "stem": string,             // the question',
        '        "options": [string, string, string, string],',
        '        "correctIndex": number,    // 0-3',
        '        "correctExplanation": string,  // why the correct option is right',
        '        "wrongExplanations": [string,string,string,string] // why each wrong option is wrong; "" for the correct index',
        "      }",
        "    }",
        "  ],",
        '  "practice": { ...MCQ },           // ONE simple application question, same shape',
        '  "summary": string                  // 2-3 line reinforcement of the learning outcome',
        "}",
        "",
        "Rules:",
        "- ALL questions MUST be multiple choice with 3-4 options. Never ask for typed input.",
        "- Each step must feel like DISCOVERY — explain one idea, then ask a guiding question.",
        "- correctExplanation must reinforce the reasoning. wrongExplanations must identify the misconception and gently correct it.",
        "- Avoid heavy calculation. Favor reasoning, intuition, and pattern recognition.",
        "- Tone: precise, futuristic, educational. Never childish.",
      ].join("\n"),
      prompt: [
        `Galaxy: ${gx.name} (topic: ${gx.topic}).`,
        prevTitles.length ? `Prerequisite stars already covered: ${prevTitles.join(", ")}.` : "",
        `Star to teach: "${star.title}". Preview: ${star.explanation}`,
        `Star difficulty: ${star.difficulty}. ${star.isBoss ? "This is the FINAL CHALLENGE — synthesize the whole galaxy." : ""}`,
        "Author the full lesson JSON now.",
      ]
        .filter(Boolean)
        .join("\n"),
    });

    let parsed: unknown;
    try {
      parsed = extractJson(text);
    } catch {
      throw new Error("Nova returned malformed lesson data. Please try again.");
    }
    const lesson = LessonSchema.parse(parsed);

    // Cache (best effort)
    await context.supabase.from("lessons").upsert({
      galaxy_id: data.galaxyId,
      star_id: data.starId,
      content: lesson as never,
    });

    return lesson;
  });

// =========================================================================
// PROGRESS + IC REWARDS
// =========================================================================

const AwardInput = z.object({ amount: z.number().int().min(1).max(500) });

export const awardIC = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => AwardInput.parse(input))
  .handler(async ({ data, context }): Promise<{ ic: number }> => {
    const { data: prof } = await context.supabase
      .from("profiles")
      .select("ic")
      .eq("id", context.userId)
      .maybeSingle();
    const current = prof?.ic ?? 0;
    const next = current + data.amount;
    const { error } = await context.supabase
      .from("profiles")
      .update({ ic: next })
      .eq("id", context.userId);
    if (error) throw new Error(error.message);
    return { ic: next };
  });

const CompleteInput = z.object({
  galaxyId: z.string().uuid(),
  starId: z.string().min(1),
});

export const completeStar = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => CompleteInput.parse(input))
  .handler(
    async ({
      data,
      context,
    }): Promise<{
      completed: string[];
      awardedIC: number;
      newBalance: number;
      galaxyComplete: boolean;
    }> => {
      // Validate the star belongs to a galaxy the user owns + count total
      const { data: gx, error: gxErr } = await context.supabase
        .from("galaxies")
        .select("id, stars")
        .eq("id", data.galaxyId)
        .maybeSingle();
      if (gxErr) throw new Error(gxErr.message);
      if (!gx) throw new Error("Galaxy not found");
      const stars = Array.isArray(gx.stars) ? (gx.stars as Array<{ id: string }>) : [];
      if (!stars.some((s) => s.id === data.starId)) throw new Error("Star not found");

      const { data: prog } = await context.supabase
        .from("progress")
        .select("completed_stars")
        .eq("galaxy_id", data.galaxyId)
        .maybeSingle();

      const current = prog?.completed_stars ?? [];
      const already = current.includes(data.starId);
      const completed = already ? current : [...current, data.starId];

      let awardedIC = 0;
      if (!already) {
        awardedIC += IC_REWARDS.STAR_COMPLETE;
      }
      const galaxyComplete = completed.length === stars.length && stars.length > 0;
      if (galaxyComplete && !already) {
        awardedIC += IC_REWARDS.GALAXY_COMPLETE_BONUS;
      }

      await context.supabase
        .from("progress")
        .upsert({
          user_id: context.userId,
          galaxy_id: data.galaxyId,
          completed_stars: completed,
        });

      // bump IC
      let newBalance = 0;
      const { data: prof } = await context.supabase
        .from("profiles")
        .select("ic")
        .eq("id", context.userId)
        .maybeSingle();
      newBalance = prof?.ic ?? 0;
      if (awardedIC > 0) {
        newBalance += awardedIC;
        await context.supabase
          .from("profiles")
          .update({ ic: newBalance })
          .eq("id", context.userId);
      }

      return { completed, awardedIC, newBalance, galaxyComplete };
    },
  );
