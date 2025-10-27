import './App.css';
import * as React from 'react';
import { useAgent } from 'agents/react';
import { useAgentChat } from 'agents/ai-react';
import type { UIMessage } from 'ai';
import { useState } from 'react';

export const App: React.FC = () => {
    const agent = useAgent({
        agent: 'geenie-agent',
        name: 'session-12345', // TODO
        onOpen: () => console.log('Connection to Geenie established'),
        onClose: () => console.log('Connection to Geenie closed'),
    });

    const agentChat = useAgentChat<unknown, UIMessage>({ agent });

    const isAgentReadyForNextMessage = agentChat.status === 'ready';

    const [userMessage, setUserMessage] = useState<string>('');

    const sendChatMessage = async () => {
        if (userMessage === '' || !isAgentReadyForNextMessage) {
            return;
        }

        agentChat.sendMessage({
            role: 'user',
            parts: [{ type: 'text', text: userMessage }],
        });

        setUserMessage('');
    };

    const clearHistory = async () => {
        agentChat.clearHistory();
    };

    return (
        <div>
            <h1>Geenie.</h1>

            <div className="grid gap-2 my-10">
                {agentChat.messages.map(message => (
                    <li key={message.id} className="flex">
                        <div className="w-[140px] text-left">{message.role.toUpperCase()}</div>
                        <div className="text-left w-full">
                            {message.parts
                                .filter(part => part.type === 'text')
                                .map(part => part.text)
                                .join('|')}
                        </div>
                    </li>
                ))}
            </div>

            <form
                className="flex gap-2"
                onSubmit={e => {
                    e.preventDefault();
                    sendChatMessage();
                }}
            >
                <input
                    type="text"
                    value={userMessage}
                    onChange={e => setUserMessage(e.target.value)}
                    placeholder="Ask anything"
                    className="border px-4 w-full"
                />
                <button type="submit" disabled={!isAgentReadyForNextMessage}>
                    SEND
                </button>
                <button type="button" onClick={() => clearHistory()}>
                    Clear history
                </button>
            </form>
        </div>
    );
};
