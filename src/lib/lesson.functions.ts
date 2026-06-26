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
        question: MCQSchema.optional(),
      }),
    )
    .min(3)
    .max(6),
  practice: MCQSchema.optional(),
  quiz: z.array(MCQSchema).min(8).max(12),
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

type Loose = Record<string, unknown>;

function normalizeMCQ(q: Loose): void {
  if (typeof q.stem !== "string") {
    const alt = q.question ?? q.prompt ?? q.text ?? q.q;
    if (typeof alt === "string") q.stem = alt;
  }
  if (typeof q.correctIndex !== "number") {
    const alt =
      (q.answerIndex as unknown) ??
      (q.correct as unknown) ??
      (q.correctAnswerIndex as unknown) ??
      (q.answer_index as unknown);
    if (typeof alt === "number") q.correctIndex = alt;
    else if (typeof q.answer === "string" && Array.isArray(q.options)) {
      const i = (q.options as unknown[]).indexOf(q.answer);
      if (i >= 0) q.correctIndex = i;
    } else if (typeof q.correctAnswer === "string" && Array.isArray(q.options)) {
      const i = (q.options as unknown[]).indexOf(q.correctAnswer);
      if (i >= 0) q.correctIndex = i;
    }
  }
  if (typeof q.correctExplanation !== "string") {
    const alt = q.explanation ?? q.rationale ?? q.reason ?? q.correct_explanation;
    if (typeof alt === "string") q.correctExplanation = alt;
  }
  if (!Array.isArray(q.wrongExplanations)) {
    const alt = (q as Loose).wrong_explanations ?? (q as Loose).distractorExplanations;
    if (Array.isArray(alt)) q.wrongExplanations = alt;
    else q.wrongExplanations = [];
  }
}

function normalizeLessonShape(obj: unknown): void {
  if (!obj || typeof obj !== "object") return;
  const o = obj as Loose;
  if (Array.isArray(o.quiz)) {
    for (const q of o.quiz) if (q && typeof q === "object") normalizeMCQ(q as Loose);
  }
  if (Array.isArray(o.steps)) {
    for (const s of o.steps) {
      if (s && typeof s === "object") {
        const step = s as Loose;
        if (step.question && typeof step.question === "object") normalizeMCQ(step.question as Loose);
      }
    }
  }
  if (o.practice && typeof o.practice === "object") normalizeMCQ(o.practice as Loose);
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
      // schema migrated → regenerate
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
        "Author ONE interactive lesson for a single star. The learner LEARNS FIRST, then takes a quiz.",
        "Respond with ONE JSON object, no markdown, no commentary.",
        "",
        "JSON shape:",
        "{",
        '  "coreIdea": string,              // 5-8 sentences. A rich, intuitive overview of why this idea matters and the big picture. Use plain language, analogies welcome.',
        '  "steps": [                        // 3-5 TEACHING steps. Each step teaches ONE focused idea in depth.',
        "    {",
        '      "title": string,',
        '      "explanation": string,        // 4-8 sentences. Real teaching: definitions, an example or analogy, why it works, common pitfalls. Use newlines to separate paragraphs for readability.',
        '      "question": {                 // OPTIONAL inline checkpoint. Include for ~half the steps (skip the rest, omit the field entirely). Use to keep learner active mid-lesson.',
        '        "stem": string,',
        '        "options": [string, string, string, string],',
        '        "correctIndex": number,    // 0-3',
        '        "correctExplanation": string,',
        '        "wrongExplanations": [string,string,string,string]',
        "      }",
        "    }",
        "  ],",
        '  "quiz": [ ...MCQ, ... ],         // EXACTLY 10 MCQs covering the whole lesson, mixed difficulty, ordered easier → harder. This is the final assessment after all teaching.',
        '  "summary": string                  // 3-5 sentences reinforcing the learning outcome and what to remember.',
        "}",
        "",
        "Rules:",
        "- LEARNING FIRST. Steps must teach with substance — do not turn every step into a quiz.",
        "- The 10-question quiz comes AFTER all teaching. Quiz questions should test understanding, not memorization.",
        "- Every MCQ has 3-4 options. Never ask for typed input.",
        "- correctExplanation reinforces the reasoning. wrongExplanations identify the misconception and gently correct it. Use \"\" for the correct option's slot.",
        "- Favor reasoning, intuition, and pattern recognition over heavy calculation.",
        "- Tone: precise, futuristic, educational. Never childish.",
      ].join("\n"),
      prompt: [
        `Galaxy: ${gx.name} (topic: ${gx.topic}).`,
        prevTitles.length ? `Prerequisite stars already covered: ${prevTitles.join(", ")}.` : "",
        `Star to teach: "${star.title}". Preview: ${star.explanation}`,
        `Star difficulty: ${star.difficulty}. ${star.isBoss ? "This is the FINAL CHALLENGE — synthesize the whole galaxy." : ""}`,
        "Author the full lesson JSON now. Remember: rich teaching steps first, then a 10-question quiz.",
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
    normalizeLessonShape(parsed);
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
