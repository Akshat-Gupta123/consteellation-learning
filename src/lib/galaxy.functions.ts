import { createServerFn } from "@tanstack/react-start";
import { generateText } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Galaxy, GalaxyProgress, Star, Difficulty } from "./types";

// =========================================================================
// AI GENERATION
// =========================================================================

const GenerateInput = z.object({ topic: z.string().min(1).max(120) });

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

export type GeneratedGalaxy = z.infer<typeof GalaxySchema>;

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
 * generateAndSaveGalaxy
 * 1. Calls Lovable AI to plan a galaxy structure for the topic.
 * 2. Inserts it into the user's `galaxies` table.
 * 3. Returns the saved galaxy id so the client can navigate.
 */
export const generateAndSaveGalaxy = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => GenerateInput.parse(input))
  .handler(async ({ data, context }): Promise<{ id: string }> => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");

    const gateway = createLovableAiGatewayProvider(key);

    const { text } = await generateText({
      model: gateway("google/gemini-3-flash-preview"),
      system: [
        "You are Nova, the curriculum designer of Constellation, a serious educational platform.",
        "You turn a topic into a structured learning journey shaped like a galaxy of stars.",
        "Respond with ONLY a single valid JSON object — no markdown, no commentary, no code fences.",
        "",
        "JSON shape:",
        "{",
        '  "name": string,            // reads like "X Galaxy"',
        '  "description": string,     // 2-3 line summary of the journey',
        '  "difficulty": "Easy" | "Medium" | "Hard",',
        '  "stars": [{ "title", "explanation", "keyPoints"[], "example", "difficulty", "isBoss" }]',
        "}",
        "",
        "Rules:",
        "- Produce between 6 and 10 stars, ordered strictly beginner -> advanced.",
        "- Difficulty rises across the journey.",
        "- The FINAL star is the capstone challenge: isBoss=true, difficulty=Hard. Others isBoss=false.",
        "- Each `explanation` is a 1-2 line preview of what the star teaches. NOT a full lesson.",
        "- Tone: precise, futuristic, educational. Never childish.",
      ].join("\n"),
      prompt: `Create a learning galaxy for the topic: "${data.topic}". Return JSON only.`,
    });

    let parsed: unknown;
    try {
      parsed = extractJson(text);
    } catch {
      throw new Error("Nova returned malformed data. Please try again.");
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

    const { data: row, error } = await context.supabase
      .from("galaxies")
      .insert({
        user_id: context.userId,
        topic: data.topic,
        name: generated.name,
        description: generated.description,
        difficulty: generated.difficulty,
        stars: stars as never,
      })
      .select("id")
      .single();

    if (error || !row) throw new Error(error?.message ?? "Could not save galaxy");
    return { id: row.id };
  });

// =========================================================================
// QUERIES
// =========================================================================

function rowToGalaxy(row: {
  id: string;
  topic: string;
  name: string;
  description: string;
  difficulty: string;
  stars: unknown;
  created_at: string;
}): Galaxy {
  return {
    id: row.id,
    topic: row.topic,
    name: row.name,
    description: row.description ?? "",
    difficulty: (row.difficulty as Difficulty) ?? "Medium",
    stars: Array.isArray(row.stars) ? (row.stars as Star[]) : [],
    createdAt: new Date(row.created_at).getTime(),
  };
}

export const listGalaxies = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<Galaxy[]> => {
    const { data, error } = await context.supabase
      .from("galaxies")
      .select("id, topic, name, description, difficulty, stars, created_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map(rowToGalaxy);
  });

export const listAllProgress = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<GalaxyProgress[]> => {
    const { data, error } = await context.supabase
      .from("progress")
      .select("galaxy_id, completed_stars");
    if (error) throw new Error(error.message);
    return (data ?? []).map((r) => ({
      galaxyId: r.galaxy_id as string,
      completed: (r.completed_stars as string[] | null) ?? [],
    }));
  });

export const getGalaxyById = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(
    async ({
      data,
      context,
    }): Promise<{ galaxy: Galaxy; progress: GalaxyProgress } | null> => {
      const { data: row, error } = await context.supabase
        .from("galaxies")
        .select("id, topic, name, description, difficulty, stars, created_at")
        .eq("id", data.id)
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (!row) return null;

      const { data: prog } = await context.supabase
        .from("progress")
        .select("completed_stars")
        .eq("galaxy_id", data.id)
        .maybeSingle();

      return {
        galaxy: rowToGalaxy(row),
        progress: {
          galaxyId: data.id,
          completed: prog?.completed_stars ?? [],
        },
      };
    },
  );

export const deleteGalaxyFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const { error } = await context.supabase.from("galaxies").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// =========================================================================
// LEGACY localStorage MIGRATION
// =========================================================================

const MigrateInput = z.object({
  galaxies: z.array(
    z.object({
      id: z.string(),
      topic: z.string(),
      name: z.string(),
      description: z.string().default(""),
      difficulty: z.enum(["Easy", "Medium", "Hard"]).catch("Medium"),
      stars: z.array(
        z.object({
          id: z.string(),
          title: z.string(),
          explanation: z.string().default(""),
          keyPoints: z.array(z.string()).default([]),
          example: z.string().optional().default(""),
          difficulty: z.enum(["Easy", "Medium", "Hard"]).catch("Medium"),
          isBoss: z.boolean().optional().default(false),
        }),
      ),
      createdAt: z.number().optional(),
    }),
  ),
  progress: z.record(z.string(), z.object({ completed: z.array(z.string()).default([]) })),
});

/** Bulk-imports galaxies/progress from a user's old localStorage. */
export const migrateLocalGalaxies = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => MigrateInput.parse(input))
  .handler(async ({ data, context }): Promise<{ imported: number }> => {
    if (data.galaxies.length === 0) return { imported: 0 };

    // Skip galaxies the user already has (match by topic+name) to avoid duplicates on remount.
    const { data: existing } = await context.supabase
      .from("galaxies")
      .select("topic,name");
    const existingKey = new Set((existing ?? []).map((e) => `${e.topic}::${e.name}`));

    let imported = 0;
    for (const g of data.galaxies) {
      if (existingKey.has(`${g.topic}::${g.name}`)) continue;

      const insert = await context.supabase
        .from("galaxies")
        .insert({
          user_id: context.userId,
          topic: g.topic,
          name: g.name,
          description: g.description,
          difficulty: g.difficulty,
          stars: g.stars as never,
        })
        .select("id")
        .single();
      if (insert.error || !insert.data) continue;

      const prog = data.progress[g.id];
      if (prog && prog.completed.length) {
        // Map old star ids to new (they're the same — we preserved client ids).
        await context.supabase.from("progress").upsert({
          user_id: context.userId,
          galaxy_id: insert.data.id,
          completed_stars: prog.completed,
        });
      }
      imported += 1;
    }
    return { imported };
  });
