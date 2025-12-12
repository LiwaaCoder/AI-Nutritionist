export enum MessageSender {
    USER = 'user',
    BOT = 'bot',
}

export interface FoodLogEntry {
    id: string;
    name: string;
    timestamp: string | Date; // Allow both for easier storage handling
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
}

export interface ChatMessage {
    id: string;
    sender: MessageSender;
    text: string;
    image?: string;
    timestamp: string | Date;
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
    user_update?: {
        age?: number;
        weight?: number;
        height?: number;
        gender?: Gender;
        fitnessGoal?: FitnessGoal;
        activityLevel?: ActivityLevel;
    };
}
