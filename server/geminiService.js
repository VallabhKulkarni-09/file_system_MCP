import { GoogleGenerativeAI } from '@google/generative-ai';
import mcpClient from './mcpClient.js';

class GeminiService {
    constructor() {
        this.genAI = null;
        this.model = null;
        this.chatSession = null;
        this.isInitialized = false;
    }

    async initialize() {
        if (this.isInitialized) {
            return;
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey || apiKey === 'your_gemini_api_key_here') {
            throw new Error('GEMINI_API_KEY is not configured. Please add your API key to .env file.');
        }

        this.genAI = new GoogleGenerativeAI(apiKey);

        // Connect to MCP and get available tools
        await mcpClient.connect();
        const mcpTools = mcpClient.getToolDefinitions();

        // Convert MCP tools to Gemini function declarations
        const functionDeclarations = mcpTools.map(tool => ({
            name: tool.name,
            description: tool.description,
            parameters: this.convertToGeminiSchema(tool.parameters)
        }));

        console.log('Registered functions:', functionDeclarations.map(f => f.name).join(', '));

        // Initialize the model with function calling
        this.model = this.genAI.getGenerativeModel({
            model: 'gemini-2.5-flash',
            systemInstruction: this.getSystemPrompt(),
            tools: [{ functionDeclarations }]
        });

        this.isInitialized = true;
        console.log('Gemini service initialized');
    }

    getSystemPrompt() {
        return `You are a helpful filesystem assistant for a Linux Mint computer. You can help users manage their files and directories using the available filesystem tools.

IMPORTANT GUIDELINES:
1. When users ask about files or directories, use the appropriate filesystem tools to help them.
2. For reading files, use the read_file tool.
3. For listing directory contents, use the list_directory tool.
4. For creating files, use the write_file tool.
5. For creating directories, use the create_directory tool.
6. For moving/renaming files, use the move_file tool.
7. For searching files, use the search_files tool.
8. For getting file info, use the get_file_info tool.

SAFETY GUIDELINES:
- Always confirm before deleting or modifying important system files
- Be cautious with operations in /etc, /usr, /var, /boot, and other system directories
- Warn users about potentially destructive operations

When presenting file contents or directory listings:
- Format the output nicely for readability
- For code files, mention the file type
- For large files, summarize the key parts

Always be helpful, clear, and explain what you're doing.`;
    }

    convertToGeminiSchema(mcpSchema) {
        if (!mcpSchema) {
            return { type: 'object', properties: {} };
        }

        // Clone and clean up the schema for Gemini
        const schema = JSON.parse(JSON.stringify(mcpSchema));

        // Remove $schema and additionalProperties if present
        delete schema.$schema;
        delete schema.additionalProperties;

        // Ensure type is set
        if (!schema.type) {
            schema.type = 'object';
        }

        return schema;
    }

    async chat(userMessage, conversationHistory = []) {
        if (!this.isInitialized) {
            await this.initialize();
        }

        try {
            // Build the conversation contents
            const contents = [
                ...conversationHistory.map(msg => ({
                    role: msg.role === 'user' ? 'user' : 'model',
                    parts: [{ text: msg.content }]
                })),
                {
                    role: 'user',
                    parts: [{ text: userMessage }]
                }
            ];

            // Generate response
            let response = await this.model.generateContent({ contents });
            let result = response.response;

            // Handle function calls
            let functionCalls = result.candidates?.[0]?.content?.parts?.filter(
                part => part.functionCall
            ) || [];

            const toolResults = [];

            while (functionCalls.length > 0) {
                console.log(`Processing ${functionCalls.length} function call(s)...`);

                // Execute all function calls
                const functionResponses = [];
                for (const part of functionCalls) {
                    const { name, args } = part.functionCall;
                    console.log(`Calling function: ${name}`);

                    try {
                        const toolResult = await mcpClient.callTool(name, args);
                        const resultText = toolResult.content?.[0]?.text || JSON.stringify(toolResult);

                        toolResults.push({
                            tool: name,
                            args: args,
                            result: resultText
                        });

                        functionResponses.push({
                            functionResponse: {
                                name: name,
                                response: { result: resultText }
                            }
                        });
                    } catch (error) {
                        const errorMessage = `Error executing ${name}: ${error.message}`;
                        toolResults.push({
                            tool: name,
                            args: args,
                            error: errorMessage
                        });

                        functionResponses.push({
                            functionResponse: {
                                name: name,
                                response: { error: errorMessage }
                            }
                        });
                    }
                }

                // Continue the conversation with function results
                contents.push({
                    role: 'model',
                    parts: functionCalls
                });
                contents.push({
                    role: 'user',
                    parts: functionResponses
                });

                // Get next response
                response = await this.model.generateContent({ contents });
                result = response.response;

                // Check for more function calls
                functionCalls = result.candidates?.[0]?.content?.parts?.filter(
                    part => part.functionCall
                ) || [];
            }

            // Extract the final text response
            const textParts = result.candidates?.[0]?.content?.parts?.filter(
                part => part.text
            ) || [];

            const assistantMessage = textParts.map(p => p.text).join('\n') ||
                'I completed the operation but have no additional comments.';

            return {
                message: assistantMessage,
                toolResults: toolResults
            };

        } catch (error) {
            console.error('Gemini chat error:', error);
            throw error;
        }
    }
}

// Singleton instance
const geminiService = new GeminiService();

export default geminiService;


