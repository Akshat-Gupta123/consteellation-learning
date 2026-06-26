import { createServerFn } from "@tanstack/react-start";
import { generateText } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";

const AskInput = z.object({
  lessonTitle: z.string().min(1),
  lessonExplanation: z.string().default(""),
  galaxyName: z.string().default(""),
  previousStars: z.array(z.string()).default([]),
  hintLevel: z.number().int().min(1).max(3).default(1),
  currentQuestion: z
    .object({
      stem: z.string(),
      options: z.array(z.string()).default([]),
      phase: z.string().default("quiz"),
      index: z.number().int().optional(),
      total: z.number().int().optional(),
    })
    .optional(),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string(),
      }),
    )
    .default([]),
  message: z.string().min(1).max(2000),
});

export const askNova = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => AskInput.parse(input))
  .handler(async ({ data }): Promise<{ reply: string }> => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");

    const gateway = createLovableAiGatewayProvider(key);

    const hintGuidance =
      data.hintLevel === 1
        ? "This is HINT LEVEL 1: give a gentle nudge in the right direction. Point at what to consider first. Keep it short."
        : data.hintLevel === 2
          ? "This is HINT LEVEL 2: give a deeper explanation of the underlying concept and a guiding question, but still no final answer."
          : "This is HINT LEVEL 3: give near-solution guidance, walk through the reasoning steps and structure, but STOP before stating the final answer. Let the learner take the last step.";

    const system = [
      "You are Nova, the AI tutor inside Constellation, a serious learning platform.",
      `The learner is studying the lesson "${data.lessonTitle}"` +
        (data.galaxyName ? ` in the ${data.galaxyName}.` : "."),
      data.lessonExplanation ? `Lesson context: ${data.lessonExplanation}` : "",
      data.previousStars.length
        ? `Prerequisite stars already in this journey: ${data.previousStars.join(", ")}.`
        : "",
      data.currentQuestion
        ? [
            `THE LEARNER IS CURRENTLY ON THIS ${data.currentQuestion.phase.toUpperCase()} QUESTION` +
              (data.currentQuestion.index !== undefined && data.currentQuestion.total !== undefined
                ? ` (${data.currentQuestion.index + 1} of ${data.currentQuestion.total})`
                : "") +
              ":",
            `Question: ${data.currentQuestion.stem}`,
            data.currentQuestion.options.length
              ? "Options:\n" +
                data.currentQuestion.options
                  .map((o, i) => `  ${String.fromCharCode(65 + i)}. ${o}`)
                  .join("\n")
              : "",
            "Tailor your hint to THIS specific question. Do NOT state which option is correct or reveal the answer; guide the learner's thinking about this exact problem.",
          ]
            .filter(Boolean)
            .join("\n")
        : "",
      "STRICT TUTORING RULES:",
      "- NEVER give the final answer or full solution outright.",
      "- ONLY give guided hints and teach step-by-step thinking.",
      "- Ask guiding questions and break problems into smaller parts.",
      "- If the learner seems stuck, suggest revisiting a relevant prerequisite star by name.",
      "- Be encouraging, concise, and use clear formatting (short paragraphs or bullets).",
      hintGuidance,
    ]
      .filter(Boolean)
      .join("\n");

    const { text } = await generateText({
      model: gateway("google/gemini-3-flash-preview"),
      system,
      messages: [
        ...data.history.map((m) => ({ role: m.role, content: m.content })),
        { role: "user" as const, content: data.message },
      ],
    });

    return { reply: text };
  });
