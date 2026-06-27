export type Difficulty = "Easy" | "Medium" | "Hard";

export interface Star {
  id: string;
  title: string;
  explanation: string;
  keyPoints: string[];
  example?: string;
  difficulty: Difficulty;
  isBoss?: boolean;
}

export interface Galaxy {
  id: string;
  topic: string;
  name: string;
  description: string;
  difficulty: Difficulty;
  stars: Star[];
  createdAt: number;
}

export interface GalaxyProgress {
  galaxyId: string;
  completed: string[];
}

export interface NovaMessage {
  role: "user" | "assistant";
  content: string;
}

export interface MCQ {
  stem: string;
  options: string[];
  correctIndex: number;
  correctExplanation: string;
  wrongExplanations: string[];
}

export interface LessonStep {
  title: string;
  explanation: string;
  question?: MCQ;
}

export interface Lesson {
  coreIdea: string;
  steps: LessonStep[];
  practice?: MCQ;
  quiz: MCQ[];
  summary: string;
}

export interface Profile {
  id: string;
  email: string | null;
  displayName: string | null;
  ic: number;
  streakDays: number;
  avatar: AvatarCustomization;
}

export interface AvatarCustomization {
  suit: string;
  helmet: string;
  ship: string;
  effect: string;
  terrain: string;
}

export type GarageSlot = "suit" | "helmet" | "ship" | "effect" | "terrain";

export interface GarageItem {
  id: string;
  slot: GarageSlot;
  name: string;
  description: string;
  price: number;
  rarity: "Standard" | "Rare" | "Legendary";
  swatch: string;
  image?: string;
  /**
   * Suits only: when true, the suit artwork already contains a helmet,
   * so the garage preview skips the separate helmet overlay.
   */
  includesHelmet?: boolean;
  /**
   * 0–1 vertical position of the suit's neck ring inside the PNG, measured
   * from the TOP. Used to align the helmet so it sits ON the neck ring.
   */
  neckY?: number;
  /**
   * Helmet only: 0–1 vertical position of the helmet's base (where it meets
   * the neck) inside the PNG, measured from the TOP.
   */
  baseY?: number;
}
