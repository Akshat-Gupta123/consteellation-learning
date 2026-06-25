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
  wrongExplanations: string[]; // same length as options; entry for the correct one can be ""
}

export interface LessonStep {
  title: string;
  explanation: string; // teaches ONE idea
  question: MCQ;
}

export interface Lesson {
  coreIdea: string;
  steps: LessonStep[];
  practice: MCQ;
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
}

export type GarageSlot = "suit" | "helmet" | "ship" | "effect";

export interface GarageItem {
  id: string;
  slot: GarageSlot;
  name: string;
  description: string;
  price: number; // in IC
  rarity: "Standard" | "Rare" | "Legendary";
  swatch: string; // gradient or color
}
