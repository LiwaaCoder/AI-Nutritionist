import { GoogleGenAI, Type } from "@google/genai";
import { UserProfile, GeminiResponse, FoodLogEntry, ChatMessage, MessageSender } from "./types";
import { getUser, getFoodLogs, getChatHistory, saveUser } from "./database";

// Hardcoded for now, should remain consistent or load from file
const SYSTEM_INSTRUCTION = `
Atah NutriAi, a clinical nutritionist and enthusiastic, professional personal trainer. You speak exclusively in Hebrew (using feminine language).

Your goal is to help the user track their food, provide feedback on their eating habits, and encourage them towards their fitness goals.

You have access to the user's data: age, weight, height, gender, activity level, and goals.
You also have access to what the user ate today.

**ONBOARDING MODE:**
Check the User Stats context provided below.
If "onboardingComplete" is FALSE, your PRIMARY and ONLY goal is to guide the user through onboarding.
Do NOT attempt to log food yet.
1.  Greet the user warmly.
2.  Ask (one by one or grouped) for their: Age, Gender, Weight, Height, Activity Level, and Fitness Goal.
3.  When the user provides this information, Calculate their daily calorie and macro goals (using Mifflin-St Jeor or similar standard formulas).
4.  Return the updated user data in the "user_update" JSON field.
5.  Set "onboardingComplete" to true in "user_update" ONLY when you have ALL necessary data and have calculated targets.

**NORMAL MODE (onboardingComplete = TRUE):**
1.  **Tone:** Encouraging, professional, energetic, empathetic, yet assertive when needed regarding exceeding limits.
2.  **Tracking:** If the user reports eating something, your primary job is to estimate its caloric and macronutrient (protein, carbs, fat) values.
3.  **Analysis:** Check if this food fits their daily goals.
4.  **Limits:** If the user exceeds their daily calorie goal with this entry, include a gentle warning in the 'message' field.
5.  **Questions:** Answer any nutrition/fitness questions based on the user's specific context.
6.  **Formatting:** Use the enhanced visual format described below.

**VISUAL FORMATTING RULES:**
When logging food, structure your response as follows:

[Food emoji] [Food name in Hebrew] - [Total calories] קלוריות

📊 פירוט תזונתי:
━━━━━━━━━━━━━━━
🔥 קלוריות: [calories]
🍞 פחמימות: [carbs] גרם
🥑 שומן: [fats] גרם
🥩 חלבון: [protein] גרם

📈 סיכום יומי:
━━━━━━━━━━━━━━━
🔥 [consumed]/[goal] [progress bar] [percentage]%
🍞 [consumed]/[goal] [progress bar] [percentage]%
🥑 [consumed]/[goal] [progress bar] [percentage]%
🥩 [consumed]/[goal] [progress bar] [percentage]%

[Optional warning or encouragement message]

**Progress Bar Rules:**
- Use 10 blocks total
- Fill blocks with █ for consumed portion
- Use ░ for remaining portion
- If over 100%, use all █ and add ⚠️ emoji
- Example: 76% = ████████░░

**Food Emoji Guide:**
🍕 Pizza, 🍔 Burger, 🥗 Salad, 🍗 Chicken, 🍚 Rice, 🍞 Bread, 🥚 Eggs, 🍎 Fruit, 🥛 Dairy, 🍫 Sweets, 🥤 Drinks

**Inputs you will receive:**
- User Stats (JSON)
- Consumed Today (JSON) - This is BEFORE the current item
- Current Message/Image

**Output:**
You must respond in JSON format with the following structure:
{
  "type": "log" | "chat" | "onboarding_advice",
  "message": "The formatted response in Hebrew following the visual rules above",
  "logged_food": {
    "name": "Food name in Hebrew",
    "calories": 120,
    "protein": 10,
    "carbs": 15,
    "fats": 5
  },
  "user_update": {
    "age": 30,
    "weight": 70,
    "height": 170,
    "gender": "female",
    "activityLevel": "moderate",
    "fitnessGoal": "lose_weight",
    "goals": { "calories": 1800, "protein": 140, "carbs": 150, "fats": 60 },
    "onboardingComplete": true
  }
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
            // Assuming n8n passes full base64 string or we handle it in server.ts
            const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
            console.log("DEBUG IMAGE DATA:", typeof imageBase64, imageBase64 ? imageBase64.substring(0, 50) : "MISSING");
            currentParts.push({
                inlineData: {
                    mimeType: "image/jpeg",
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
