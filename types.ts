export enum MessageSender {
  USER = 'user',
  BOT = 'bot',
}

export interface FoodLogEntry {
  id: string;
  name: string;
  timestamp: Date;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
}

export interface ChatMessage {
  id: string;
  sender: MessageSender;
  text: string;
  image?: string; // Base64 string
  timestamp: Date;
  foodLog?: FoodLogEntry; // Optional structured data for food cards
}

export interface MacroGoals {
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
}

export type Gender = 'male' | 'female';
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
export type FitnessGoal = 'lose_weight' | 'maintain' | 'gain_muscle';

export interface UserProfile {
  name: string;
  age: number;
  gender: Gender;
  weight: number;
  height: number;
  activityLevel: ActivityLevel;
  fitnessGoal: FitnessGoal;
  goals: MacroGoals;
  onboardingComplete: boolean;
}

// Structure expected from Gemini
export interface GeminiResponse {
  type: 'log' | 'chat' | 'onboarding_advice';
  message: string;
  logged_food?: {
    name: string;
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
  };
}