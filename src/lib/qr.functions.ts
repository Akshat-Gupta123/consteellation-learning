import { createServerFn } from "@tanstack/react-start";
import { generateText } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Star, Difficulty } from "./types";

// =========================================================================
// LESSON UNLOCK (QR)
// =========================================================================

const LessonCodeInput = z.object({
  code: z
    .string()
    .trim()
    .min(3)
    .max(64)
    .transform((s) => s.toUpperCase()),
});

const StarSchema = z.object({
  title: z.string().min(1),
  explanation: z.string().min(1),
  keyPoints: z.array(z.string()).default([]),
  example: z.string().default(""),
  difficulty: z.enum(["Easy", "Medium", "Hard"]).catch("Medium"),
  isBoss: z.boolean().default(false),
});

const GalaxySchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  difficulty: z.enum(["Easy", "Medium", "Hard"]).catch("Medium"),
  stars: z.array(StarSchema).min(4),
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

function makeStarId() {
  return `s_${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Hidden internal system prompt used when a QR code unlocks a lesson.
 * The user never sees this. The topic comes from the code row.
 */
function lessonUnlockSystemPrompt(topic: string): string {
  return [
    "You are the Constellation curriculum engine. Silently plan a compact learning journey",
    "for the topic below. This runs in the background after a student scans an unlock code —",
    "the student does NOT see this prompt. Return ONLY a single JSON object, no markdown.",
    "",
    "JSON shape:",
    "{",
    '  "name": string,            // e.g. "Electricity & Circuits"',
    '  "description": string,     // 2-3 line summary',
    '  "difficulty": "Easy" | "Medium" | "Hard",',
    '  "stars": [{ "title", "explanation", "keyPoints"[], "example", "difficulty", "isBoss" }]',
    "}",
    "",
    "Rules:",
    "- Produce exactly 4 stars, ordered beginner -> advanced.",
    "- Star 1 covers the fundamental quantities and definitions.",
    "- Star 2 covers structural comparisons (e.g. series vs parallel).",
    "- Star 3 covers real-world applications and components.",
    "- Star 4 is the capstone challenge (isBoss=true, difficulty=Hard): a hands-on style",
    "  experiment or design problem the student would actually try.",
    "- Each `explanation` is a 1-2 line preview, NOT a full lesson.",
    "- Tone: precise, futuristic, educational. Never childish.",
    "",
    `Topic: "${topic}".`,
  ].join("\n");
}

/**
 * Redeems a lesson QR code (single-use). Silently generates a galaxy for the
 * bound topic and returns the new galaxy id. If the code was already claimed
 * by THIS user, returns the previously-created galaxy so re-navigation works.
 */
export const redeemLessonCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => LessonCodeInput.parse(input))
  .handler(async ({ data, context }): Promise<{ galaxyId: string }> => {
    const code = data.code;

    // Look up the code first
    const { data: row, error: lookupErr } = await context.supabase
      .from("lesson_codes")
      .select("code, topic, used_by")
      .eq("code", code)
      .maybeSingle();
    if (lookupErr) throw new Error(lookupErr.message);
    if (!row) throw new Error("Invalid code. Check the code and try again.");

    // If already used by another user → hard fail
    if (row.used_by && row.used_by !== context.userId) {
      throw new Error("This code has already been redeemed.");
    }

    // If already used by THIS user, return their existing galaxy for this topic
    if (row.used_by === context.userId) {
      const { data: existing } = await context.supabase
        .from("galaxies")
        .select("id, created_at")
        .eq("topic", row.topic)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (existing) return { galaxyId: existing.id };
    }

    // Atomically claim the code. RLS restricts UPDATE to rows with used_by IS NULL.
    const claim = await context.supabase
      .from("lesson_codes")
      .update({ used_by: context.userId, used_at: new Date().toISOString() })
      .eq("code", code)
      .is("used_by", null)
      .select("code")
      .maybeSingle();
    if (claim.error) throw new Error(claim.error.message);
    if (!claim.data) {
      throw new Error("This code has already been redeemed.");
    }

    // Silently generate the galaxy for this topic via Nova
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");
    const gateway = createLovableAiGatewayProvider(key);

    const { text } = await generateText({
      model: gateway("google/gemini-3-flash-preview"),
      system: lessonUnlockSystemPrompt(row.topic),
      prompt: `Generate the JSON for topic: "${row.topic}". JSON only.`,
    });

    let parsed: unknown;
    try {
      parsed = extractJson(text);
    } catch {
      throw new Error("Lesson engine returned malformed data. Please try again.");
    }
    const generated = GalaxySchema.parse(parsed);

    const stars: Star[] = generated.stars.map((s) => ({
      id: makeStarId(),
      title: s.title,
      explanation: s.explanation,
      keyPoints: s.keyPoints,
      example: s.example,
      difficulty: s.difficulty as Difficulty,
      isBoss: s.isBoss,
    }));

    const insert = await context.supabase
      .from("galaxies")
      .insert({
        user_id: context.userId,
        topic: row.topic,
        name: generated.name,
        description: generated.description,
        difficulty: generated.difficulty,
        stars: stars as never,
      })
      .select("id")
      .single();
    if (insert.error || !insert.data) {
      throw new Error(insert.error?.message ?? "Could not save lesson.");
    }

    return { galaxyId: insert.data.id };
  });

// =========================================================================
// IC REWARD (QR, LESSON-GATED)
// =========================================================================

const IcCodeInput = z.object({
  code: z
    .string()
    .trim()
    .min(3)
    .max(64)
    .transform((s) => s.toUpperCase()),
  galaxyId: z.string().uuid(),
});

/**
 * Redeems an IC QR code. Only allowed inside an unlocked lesson session:
 * the caller must pass a galaxyId that belongs to them (enforced via RLS).
 */
export const redeemIcCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => IcCodeInput.parse(input))
  .handler(
    async ({
      data,
      context,
    }): Promise<{ value: number; newBalance: number }> => {
      // Verify caller has this galaxy (RLS makes the row invisible otherwise)
      const { data: gx, error: gxErr } = await context.supabase
        .from("galaxies")
        .select("id")
        .eq("id", data.galaxyId)
        .maybeSingle();
      if (gxErr) throw new Error(gxErr.message);
      if (!gx) {
        throw new Error("Rewards can only be redeemed inside an unlocked lesson.");
      }

      const code = data.code;

      // Look up the code
      const { data: row, error: lookupErr } = await context.supabase
        .from("ic_codes")
        .select("code, value, used_by")
        .eq("code", code)
        .maybeSingle();
      if (lookupErr) throw new Error(lookupErr.message);
      if (!row) throw new Error("Invalid reward code.");
      if (row.used_by) {
        throw new Error("This reward code has already been redeemed.");
      }

      // Atomically claim
      const claim = await context.supabase
        .from("ic_codes")
        .update({ used_by: context.userId, used_at: new Date().toISOString() })
        .eq("code", code)
        .is("used_by", null)
        .select("value")
        .maybeSingle();
      if (claim.error) throw new Error(claim.error.message);
      if (!claim.data) throw new Error("This reward code has already been redeemed.");

      const value = claim.data.value as number;

      // Credit user's IC balance
      const { data: prof } = await context.supabase
        .from("profiles")
        .select("ic")
        .eq("id", context.userId)
        .maybeSingle();
      const newBalance = (prof?.ic ?? 0) + value;
      const upd = await context.supabase
        .from("profiles")
        .update({ ic: newBalance })
        .eq("id", context.userId);
      if (upd.error) throw new Error(upd.error.message);

      return { value, newBalance };
    },
  );
