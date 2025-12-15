import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import { initDb, saveChatMessage, saveFoodLog, getUser, saveUser } from './database';
import { analyzeInput } from './geminiAgent';
import { MessageSender, ChatMessage, UserProfile } from './types';
// Simple ID generator used below instead of uuid for simplicity


dotenv.config({ path: '../.env.local' }); // Load from root .env.local

const app = express();
const PORT = process.env.PORT || 3000;

// Configure Multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' })); // Support URL-encoded bodies

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
// Use upload.any() to handle multipart/form-data flexibly (accepts any field name)
app.post('/api/chat', upload.any(), async (req, res) => {
    // Extensive Debugging for Multipart
    console.log("--- MULTIPART DEBUG START ---");
    console.log("Body Keys:", Object.keys(req.body));
    console.log("Files Found:", (req.files as Express.Multer.File[])?.length || 0);
    if (req.files && Array.isArray(req.files)) {
        (req.files as Express.Multer.File[]).forEach((f, i) => {
            console.log(`File[${i}]: fieldname='${f.fieldname}', mimetype='${f.mimetype}', size=${f.size}`);
        });
    }
    console.log("--- MULTIPART DEBUG END ---");

    // Merge body and file for unified processing
    let bodyLog: any = { ...req.body };

    // Normalize image input (support both JSON base64 string OR Multer file)
    let finalImage: string | undefined = req.body.image;

    if (req.files && Array.isArray(req.files) && req.files.length > 0) {
        // Take the first file found, regardless of field name (more robust for n8n)
        const file = (req.files as Express.Multer.File[])[0];
        // Convert buffer to base64 data URI
        const b64 = file.buffer.toString('base64');
        const mime = file.mimetype || 'image/jpeg';
        finalImage = `data:${mime};base64,${b64}`;
        bodyLog.image = `[FILE UPLOADED] Field: ${file.fieldname}, Mime: ${mime}, Size: ${file.size}`;
    } else if (bodyLog.image) {
        // Existing JSON logic logging
        const imgLen = bodyLog.image.length;
        const imgType = typeof bodyLog.image;
        const imgPreview = imgLen > 50 ? bodyLog.image.substring(0, 20) + '...' : bodyLog.image;
        bodyLog.image = `[JSON STRING] Type: ${imgType}, Length: ${imgLen}, Preview: ${imgPreview}`;
    } else {
        bodyLog.image = "[MISSING or UNDEFINED]";
    }

    console.log('DEBUG: Received chat request:', JSON.stringify(bodyLog, null, 2));

    const { userId, message } = req.body;

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
            image: finalImage ? 'IMAGE_SENT' : undefined,
            timestamp: new Date()
        });

        // 2. Call Gemini Agent
        const agentResponse = await analyzeInput(userId, userText, finalImage);

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
    console.log(`Server running on http://localhost:${PORT} (vFinal MULTIPART ENABLED)`);
});
