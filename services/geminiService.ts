import { GoogleGenAI, Type } from "@google/genai";
import { UserProfile, GeminiResponse, FoodLogEntry, ChatMessage, MessageSender } from "../types";
import { SYSTEM_INSTRUCTION } from "../constants";

const getGeminiClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API_KEY is missing from environment variables");
  }
  return new GoogleGenAI({ apiKey });
};

// Helper to convert file/blob to base64
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
};

export const analyzeInput = async (
  text: string,
  imageBase64: string | undefined,
  userProfile: UserProfile,
  recentLogs: FoodLogEntry[],
  chatHistory: ChatMessage[] = []
): Promise<GeminiResponse> => {
  const ai = getGeminiClient();

  // Create a context string about what the user has eaten today for Q&A context
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
        description: "The conversational response in Hebrew. If the log puts user over daily limit, include a gentle warning here."
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
      }
    },
    required: ["type", "message"]
  };

  try {
    // Construct the conversation history (last 10 messages)
    // Map existing ChatMessage types to Gemini content parts
    const historyContents = chatHistory.slice(-10).map((msg) => ({
      role: msg.sender === MessageSender.USER ? 'user' : 'model',
      parts: [{ text: msg.text }],
    }));

    // Current user message
    const currentParts: any[] = [];
    if (imageBase64) {
      const base64Data = imageBase64.split(",")[1];
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
      currentParts.push({ text: "." }); // Empty trigger
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
    if (!responseText) {
       throw new Error("Empty response from Gemini");
    }

    return JSON.parse(responseText) as GeminiResponse;

  } catch (error) {
    console.error("Gemini Error:", error);
    return {
      type: "chat",
      message: "מצטער, נתקלתי בבעיה טכנית. אולי ננסה שוב?",
    };
  }
};