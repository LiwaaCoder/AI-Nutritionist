import { GoogleGenAI, Type } from "@google/genai";
import { UserProfile, GeminiResponse, FoodLogEntry, ChatMessage, MessageSender } from "./types";
import { getUser, getFoodLogs, getChatHistory, saveUser } from "./database";

// Hardcoded for now, should remain consistent or load from file
const SYSTEM_INSTRUCTION = `
Atah NutriAi, a clinical nutritionist and enthusiastic, professional personal trainer. You speak exclusively in Hebrew (using feminine language).

Your goal is to help the user track their food, provide feedback on their eating habits, and encourage them towards their fitness goals.

**CORE BEHAVIOR:**
1.  **Analyze Request**: Check if the user sent an image or text describing food.
2.  **PRIORITY - FOOD LOGGING**: If food is present, you MUST log it.
    - Estimate calories and macros.
    - Return the "log" type response.
    - If the user's profile is incomplete (e.g. missing weight/goal), use average defaults (e.g. 2000 kcal goal) for calculations, BUT add a polite request for the missing details in your text response.
3.  **SECONDARY - ONBOARDING**: If NO food is present and the user profile is incomplete (see User Stats below), ask ONE or TWO questions to gather missing details (Age, Gender, Weight, Height, Activity, Goal).
    - Return "onboarding_advice" or "chat".
    - Update "user_update" with any new details provided.
4.  **Tone**: Encouraging, professional, energetic.

**VISUAL FORMATTING RULES (For Food Logs):**
Structure your response EXACTLY as follows (keep strict spacing):

🍽️ *[Food Name]*
[Total calories] קלוריות

💪 *מה בפנים?*
• חלבון: [protein]g
• פחמימות: [carbs]g
• שומן: [fats]g

📊 *המאזן היומי שלך:*
━━━━━━━━━━━━━━━━
🔥 *קלוריות:* [consumed]/[goal]
   [progress bar] [percentage]%

🍖 *חלבון:*   [consumed]/[goal]
   [progress bar] [percentage]%

🍞 *פחמימות:* [consumed]/[goal]
   [progress bar] [percentage]%

🥑 *שומן:*    [consumed]/[goal]
   [progress bar] [percentage]%

💡 [Short, contextual 1-line tip like "Great protein hit!" or "Watch the fats later."]
[Optional warning or encouragement message]
[IF MISSING INFO]: "אגב, כדי שאהיה מדויקת יותר, אשמח לדעת מה הגיל והמשקל שלך?"

**Progress Bar Rules:**
- Use 10 blocks total
- Fill blocks with █ for consumed portion
- Use ░ for remaining portion
- If over 100%, use all █ and add ⚠️ emoji
- Example: 76% = ████████░░

**Food Emoji Guide:**
🍕 Pizza, 🍔 Burger, 🥗 Salad, 🍗 Chicken, 🍚 Rice, 🍞 Bread, 🥚 Eggs, 🍎 Fruit, 🥛 Dairy, 🍫 Sweets, 🥤 Drinks

**Inputs:**
- User Stats (JSON)
- Consumed Today (JSON)
- Current Message/Image

**Output JSON Structure:**
{
  "type": "log" | "chat" | "onboarding_advice",
  "message": "Hebrew response",
  "logged_food": { ... },
  "user_update": { ... }
}

**Context data:**
{{USER_STATS}}
`;

const getGeminiClient = () => {
    const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
    if (!apiKey) {
        throw new Error("API Key is missing (checked GEMINI_API_KEY and API_KEY)");
    }
    return new GoogleGenAI({ apiKey });
};

export const analyzeInput = async (
    userId: string,
    text: string,
    imageBase64: string | undefined
): Promise<GeminiResponse> => {
    const ai = getGeminiClient();

    // Fetch context from DB
    const dbProfile = await getUser(userId);

    // Initial Profile for new users
    const userProfile: UserProfile = dbProfile || {
        name: "אורח/ת",
        age: 0,
        weight: 0,
        height: 0,
        gender: "female",
        activityLevel: "moderate",
        fitnessGoal: "maintain",
        goals: {
            calories: 0,
            protein: 0,
            carbs: 0,
            fats: 0
        },
        onboardingComplete: false // Defaults to FALSE now
    };

    if (!dbProfile) {
        console.warn(`User ${userId} not found, creating default NEW profile.`);
        await saveUser(userId, userProfile);
    }

    const recentLogs = await getFoodLogs(userId, 50); // Get last 50 logs
    const chatHistory = await getChatHistory(userId, 10); // Get last 10 messages

    // Calculate today's stats
    const todayLogs = recentLogs.filter(
        (log) => new Date(log.timestamp).toDateString() === new Date().toDateString()
    );

    const consumedStats = todayLogs.reduce(
        (acc, log) => ({
            calories: acc.calories + log.calories,
            protein: acc.protein + log.protein,
            carbs: acc.carbs + log.carbs,
            fats: acc.fats + log.fats,
        }),
        { calories: 0, protein: 0, carbs: 0, fats: 0 }
    );

    const userContext = `
    Name: ${userProfile.name}
    Gender: ${userProfile.gender}
    Stats: Age ${userProfile.age}, Weight ${userProfile.weight}kg, Height ${userProfile.height}cm
    Activity Level: ${userProfile.activityLevel}
    Fitness Goal: ${userProfile.fitnessGoal}
    Daily Targets: ${JSON.stringify(userProfile.goals)}
    Onboarding Complete: ${userProfile.onboardingComplete}
    Consumed Today (EXCLUDING the item currently being logged): ${JSON.stringify(consumedStats)}
  `;

    const instruction = SYSTEM_INSTRUCTION.replace("{{USER_STATS}}", userContext);

    const responseSchema = {
        type: Type.OBJECT,
        properties: {
            type: {
                type: Type.STRING,
                enum: ["log", "chat", "onboarding_advice"],
                description: "The type of response."
            },
            message: {
                type: Type.STRING,
                description: "The conversational response in Hebrew."
            },
            logged_food: {
                type: Type.OBJECT,
                nullable: true,
                properties: {
                    name: { type: Type.STRING },
                    calories: { type: Type.NUMBER },
                    protein: { type: Type.NUMBER },
                    carbs: { type: Type.NUMBER },
                    fats: { type: Type.NUMBER }
                }
            },
            user_update: {
                type: Type.OBJECT,
                nullable: true,
                description: "Updates to user profile during onboarding",
                properties: {
                    age: { type: Type.NUMBER },
                    weight: { type: Type.NUMBER },
                    height: { type: Type.NUMBER },
                    gender: { type: Type.STRING, enum: ["male", "female"] },
                    activityLevel: { type: Type.STRING },
                    fitnessGoal: { type: Type.STRING },
                    onboardingComplete: { type: Type.BOOLEAN },
                    goals: {
                        type: Type.OBJECT,
                        properties: {
                            calories: { type: Type.NUMBER },
                            protein: { type: Type.NUMBER },
                            carbs: { type: Type.NUMBER },
                            fats: { type: Type.NUMBER }
                        }
                    }
                }
            }
        },
        required: ["type", "message"]
    };

    try {
        const historyContents = chatHistory.map((msg) => ({
            role: msg.sender === MessageSender.USER ? 'user' : 'model',
            parts: [{ text: msg.text }],
        }));

        const currentParts: any[] = [];
        if (imageBase64 && typeof imageBase64 === 'string' && imageBase64 !== 'undefined') {
            // Logic to handle image if passed from n8n (usually URL or base64)
            let mimeType = "image/jpeg";
            const match = imageBase64.match(/^data:(image\/\w+);base64,/);
            if (match) {
                mimeType = match[1];
            }
            const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
            console.log("DEBUG IMAGE DATA:", { mimeType, length: base64Data.length });

            currentParts.push({
                inlineData: {
                    mimeType: mimeType,
                    data: base64Data,
                },
            });
        }

        if (text) {
            currentParts.push({ text });
        } else if (!text && !imageBase64) {
            currentParts.push({ text: "." });
        }

        const contents = [
            ...historyContents,
            { role: 'user', parts: currentParts }
        ];

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: contents,
            config: {
                systemInstruction: instruction,
                responseMimeType: "application/json",
                responseSchema: responseSchema,
            },
        });

        const responseText = response.text;
        if (!responseText) throw new Error("Empty response");

        // Clean up markdown if present
        const cleanText = responseText.replace(/```json\n?|```/g, "").trim();

        const parsedResponse = JSON.parse(cleanText) as GeminiResponse;

        // HANDLE USER UPDATES
        if (parsedResponse.user_update) {
            console.log("Saving user profile update:", parsedResponse.user_update);
            // Merge existing profile with updates
            const updatedProfile = { ...userProfile, ...parsedResponse.user_update };
            await saveUser(userId, updatedProfile);
        }

        return parsedResponse;

    } catch (error) {
        console.error("Gemini Error:", error);
        return {
            type: "chat",
            message: "נתקלתי בשגיאה טכנית, אנא נסה שוב מאוחר יותר.",
        };
    }
};
