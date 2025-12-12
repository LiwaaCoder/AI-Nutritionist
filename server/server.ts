import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initDb, saveChatMessage, saveFoodLog, getUser, saveUser } from './database';
import { analyzeInput } from './geminiAgent';
import { MessageSender, ChatMessage, UserProfile } from './types';
// Simple ID generator used below instead of uuid for simplicity


dotenv.config({ path: '../.env.local' }); // Load from root .env.local

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Initialize DB
initDb();

// Simple ID generator
const generateId = () => Math.random().toString(36).substring(2, 15);

// API Routes

// ONBOARDING (Optional: Create user if not exists)
app.post('/api/onboarding', async (req, res) => {
    const { userId, userProfile } = req.body;
    if (!userId || !userProfile) {
        return res.status(400).json({ error: 'userId and userProfile are required' });
    }
    try {
        await saveUser(userId, userProfile);
        res.json({ message: 'User profile saved' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// CHAT (Main Entry Point)
app.post('/api/chat', async (req, res) => {
    const bodyLog = { ...req.body };
    if (bodyLog.image) bodyLog.image = `[IMAGE DATA LENGTH: ${bodyLog.image.length}]`;
    console.log('DEBUG: Received chat request:', JSON.stringify(bodyLog, null, 2));
    const { userId, message, image } = req.body;

    if (!userId) {
        return res.status(400).json({ error: 'userId is required (e.g. WhatsApp number)' });
    }

    // Default empty message if only image sent
    const userText = message || "";

    try {
        // 1. Save User Message to DB
        const userMsgId = generateId();
        await saveChatMessage(userId, {
            id: userMsgId,
            sender: MessageSender.USER,
            text: userText,
            image: image ? 'IMAGE_SENT' : undefined, // Don't save full base64 to DB for simple chat log
            timestamp: new Date()
        });

        // 2. Call Gemini Agent
        const agentResponse = await analyzeInput(userId, userText, image);

        // 3. Save Bot Response to DB
        const botMsgId = generateId();
        await saveChatMessage(userId, {
            id: botMsgId,
            sender: MessageSender.BOT,
            text: agentResponse.message,
            timestamp: new Date()
        });

        // 4. If Food Logged, Save to DB
        if (agentResponse.type === 'log' && agentResponse.logged_food) {
            await saveFoodLog(userId, {
                id: generateId(),
                name: agentResponse.logged_food.name,
                calories: agentResponse.logged_food.calories,
                protein: agentResponse.logged_food.protein,
                carbs: agentResponse.logged_food.carbs,
                fats: agentResponse.logged_food.fats,
                timestamp: new Date()
            });
        }

        // 5. Send Response back to n8n
        res.json({
            reply: agentResponse.message,
            metadata: {
                type: agentResponse.type,
                logged_food: agentResponse.logged_food
            }
        });

    } catch (error) {
        console.error("Error processing chat:", error);
        res.status(500).json({ error: "Internal processing error" });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT} (v2 DEBUG MODE)`);
});
