/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum LevelDifficulty {
  EASY = "Fácil",
  MEDIUM = "Médio",
  ADVANCED = "Avançado",
}

export interface CodingBlock {
  id: string;
  type: "command" | "loop" | "condition" | "variable" | "function" | "value";
  text: string;
  code: string; // The compiled equivalent code string
  color: string;
}

export interface LevelStage {
  id: string;
  difficulty: LevelDifficulty;
  title: string;
  description: string;
  instructions: string;
  mascotTip: string;
  characterExpression: "happy" | "thinking" | "excited" | "proud" | "confused";
  initialBlocks: CodingBlock[];
  availableBlocks: CodingBlock[];
  targetGoal: string; // e.g., "Mova o robo ate a tomada" / "Filtre os bytes maiores que 5"
  gridSize?: { rows: number; cols: number };
  startPos?: { r: number; c: number };
  targetPos?: { r: number; c: number };
  obstacles?: { r: number; c: number }[];
  expectedOutput?: string[]; // Expected console prints
  validationFnCode?: string; // Client-side JS code string to run on student output to validate
  placeholderCode: string; // Placeholder code for real-time editor
}

export interface PlayerProfile {
  uid: string;
  name: string;
  email: string;
  role: "student" | "teacher";
  xp: number;
  level: number;
  completedStages: string[]; // List of stage IDs
  teacherEmail: string; // Link to a teacher
  lastSyncedAt: string;
  streak: number; // Duolingo-style streak (Ofensiva)
  hearts: number; // Duolingo-style hearts (Vidas, 0-5)
}

export interface LeaderboardEntry {
  uid: string;
  name: string;
  xp: number;
  completedCount: number;
}

export interface StudentProgressReport {
  uid: string;
  name: string;
  email: string;
  xp: number;
  completedStagesCount: number;
  completedStagesList: string[];
  lastActive: string;
}

export interface PerformanceReport {
  teacherEmail: string;
  totalStudents: number;
  averageXp: number;
  studentDetails: StudentProgressReport[];
}
