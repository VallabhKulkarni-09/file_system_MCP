import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';

function App() {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    const exampleCommands = [
        "List files in my home directory",
        "Show contents of /etc/hostname",
        "Search for *.js files in Desktop",
        "Create a test file on Desktop",
        "What's the size of my Downloads folder?"
    ];

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMessage = input.trim();
        setInput('');
        setError(null);
        setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
        setIsLoading(true);

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: userMessage })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to get response');
            }

            setMessages(prev => [...prev, {
                role: 'assistant',
                content: data.message,
                toolResults: data.toolResults
            }]);
        } catch (err) {
            setError(err.message);
            console.error('Chat error:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleExampleClick = (command) => {
        setInput(command);
        inputRef.current?.focus();
    };

    const handleClearChat = async () => {
        setMessages([]);
        setError(null);
        try {
            await fetch('/api/clear', { method: 'POST' });
        } catch (err) {
            console.error('Failed to clear:', err);
        }
    };

    return (
        <div className="app-container">
            <header className="header">
                <h1>Filesystem Chatbot</h1>
                <p>Control your Linux system with natural language</p>
                <div className="status-badge">
                    <span className="status-dot"></span>
                    Gemini AI + MCP Connected
                </div>
            </header>

            <div className="chat-container">
                <div className="messages-area">
                    {messages.length === 0 && !isLoading ? (
                        <div className="empty-state">
                            <h3>System Ready</h3>
                            <p>How can I help you manage your files?</p>
                            <div className="example-commands">
                                {exampleCommands.map((cmd, i) => (
                                    <button
                                        key={i}
                                        className="example-command"
                                        onClick={() => handleExampleClick(cmd)}
                                    >
                                        {cmd}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <>
                            {messages.map((msg, index) => (
                                <div key={index} className={`message ${msg.role}`}>
                                    <div className="message-avatar">
                                        {msg.role === 'user' ? 'You' : 'AI'}
                                    </div>
                                    <div className="message-content">
                                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                                        {msg.toolResults && msg.toolResults.length > 0 && (
                                            <div className="tool-results">
                                                {msg.toolResults.map((result, i) => (
                                                    <div key={i} className="tool-result">
                                                        <div className={`tool-result-header ${result.error ? 'error' : ''}`}>
                                                            Tool: {result.tool}
                                                            {result.args && Object.keys(result.args).length > 0 && (
                                                                <span style={{ opacity: 0.7, marginLeft: '0.5rem' }}>
                                                                    ({Object.entries(result.args).map(([k, v]) =>
                                                                        `${k}: ${typeof v === 'string' && v.length > 30 ? v.slice(0, 30) + '...' : v}`
                                                                    ).join(', ')})
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="tool-result-content">
                                                            {result.error || result.result}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {isLoading && (
                                <div className="message assistant">
                                    <div className="message-avatar">AI</div>
                                    <div className="message-content loading-message">
                                        <div className="loading-dots">
                                            <span></span>
                                            <span></span>
                                            <span></span>
                                        </div>
                                        <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                            Processing...
                                        </span>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                    {error && (
                        <div className="error-message">
                            Error: {error}
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                <div className="input-area">
                    <form className="input-form" onSubmit={handleSubmit}>
                        <div className="input-wrapper">
                            <input
                                ref={inputRef}
                                type="text"
                                className="chat-input"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="Enter command..."
                                disabled={isLoading}
                            />
                            {messages.length > 0 && (
                                <button
                                    type="button"
                                    className="clear-button"
                                    onClick={handleClearChat}
                                    title="Clear chat"
                                >
                                    Clear
                                </button>
                            )}
                        </div>
                        <button
                            type="submit"
                            className="send-button"
                            disabled={isLoading || !input.trim()}
                        >
                            {isLoading ? 'Sending...' : 'Send Command'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}

export default App;
