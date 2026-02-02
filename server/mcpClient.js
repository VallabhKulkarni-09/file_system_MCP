import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

class MCPFilesystemClient {
  constructor() {
    this.client = null;
    this.transport = null;
    this.isConnected = false;
    this.availableTools = [];
  }

  async connect() {
    if (this.isConnected) {
      return;
    }

    try {
      console.log('Connecting to MCP Filesystem Server...');

      // Create transport with command to spawn the MCP server
      this.transport = new StdioClientTransport({
        command: 'npx',
        args: ['-y', '@modelcontextprotocol/server-filesystem', '/'],
        env: process.env
      });

      this.client = new Client({
        name: 'filesystem-chatbot',
        version: '1.0.0',
      }, {
        capabilities: {}
      });

      await this.client.connect(this.transport);
      this.isConnected = true;

      // Get available tools
      const toolsResponse = await this.client.listTools();
      this.availableTools = toolsResponse.tools || [];

      console.log('MCP Filesystem Server connected!');
      console.log(`Available tools: ${this.availableTools.map(t => t.name).join(', ')}`);

      return this.availableTools;
    } catch (error) {
      console.error('Failed to connect to MCP Filesystem Server:', error);
      throw error;
    }
  }

  async callTool(toolName, args) {
    if (!this.isConnected) {
      await this.connect();
    }

    try {
      console.log(`Calling tool: ${toolName} with args:`, JSON.stringify(args));

      const result = await this.client.callTool({
        name: toolName,
        arguments: args
      });

      console.log(`Tool ${toolName} completed`);
      return result;
    } catch (error) {
      console.error(`Tool ${toolName} failed:`, error);
      throw error;
    }
  }

  getToolDefinitions() {
    // Return tool definitions in a format suitable for Gemini function calling
    return this.availableTools.map(tool => ({
      name: tool.name,
      description: tool.description,
      parameters: tool.inputSchema
    }));
  }

  async disconnect() {
    if (this.transport) {
      await this.transport.close();
      this.isConnected = false;
      console.log('MCP Filesystem Server disconnected');
    }
  }
}

// Singleton instance
const mcpClient = new MCPFilesystemClient();

export default mcpClient;
