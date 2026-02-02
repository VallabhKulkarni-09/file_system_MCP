import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import geminiService from './geminiService.js';

// Load environment variables from parent directory
dotenv.config({ path: '../.env' });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from the React app
app.use(express.static(path.join(__dirname, '../client/dist')));

// Store conversation history per session (in-memory for simplicity)
const conversations = new Map();

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Filesystem Chatbot API is running' });
});

// Chat endpoint
app.post('/api/chat', async (req, res) => {
    try {
        const { message, sessionId = 'default' } = req.body;

        if (!message) {
            return res.status(400).json({ error: 'Message is required' });
        }

        console.log(`\nReceived message: "${message}"`);

        // Get or create conversation history
        if (!conversations.has(sessionId)) {
            conversations.set(sessionId, []);
        }
        const history = conversations.get(sessionId);

        // Get response from Gemini
        const response = await geminiService.chat(message, history);

        // Update conversation history
        history.push({ role: 'user', content: message });
        history.push({ role: 'assistant', content: response.message });

        // Keep history manageable (last 20 messages)
        if (history.length > 20) {
            history.splice(0, history.length - 20);
        }

        console.log(`Response generated`);

        res.json({
            message: response.message,
            toolResults: response.toolResults,
            sessionId
        });

    } catch (error) {
        console.error('Chat error:', error);
        res.status(500).json({
            error: error.message || 'An error occurred while processing your request'
        });
    }
});

// Clear conversation history
app.post('/api/clear', (req, res) => {
    const { sessionId = 'default' } = req.body;
    conversations.delete(sessionId);
    res.json({ message: 'Conversation cleared' });
});

// The "catchall" handler: for any request that doesn't
// match one above, send back React's index.html file.
app.get('*', (req, res) => {
    // Check if it's an API request first, though generic * usually catches all.
    // We already handled /api routes above.
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

// Initialize and start server
async function startServer() {
    try {
        console.log('Starting Filesystem Chatbot Server...');

        // Pre-initialize Gemini service
        await geminiService.initialize();

        app.listen(PORT, () => {
            console.log(`\nServer running on http://localhost:${PORT}`);
            console.log('Filesystem MCP connected with full access');
            console.log('Gemini AI ready for chat\n');
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

startServer();
