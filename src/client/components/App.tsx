import React, { useState } from 'react';
import { useAgent } from 'agents/react';
import { useAgentChat } from 'agents/ai-react';
import type { UIMessage } from 'ai';
import { type OSMNode, ResultMap } from './ResultMap.tsx';

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
            <h1 className="text-4xl font-bold">Geenie.</h1>

            <div className="grid gap-2 my-10">
                {agentChat.messages.map(message => (
                    <li key={message.id} className="flex">
                        <div className="w-[140px] text-left">{message.role.toUpperCase()}</div>
                        <div className="text-left w-full">
                            {message.parts.map((part, index) => (
                                <div key={index}>
                                    {part.type === 'text' ? (
                                        <div>{part.text}</div>
                                    ) : part.type === 'dynamic-tool' ? (
                                        <div>[DYNAMIC TOOL] {JSON.stringify(part)}</div>
                                    ) : part.type === 'tool-executeOverpassQuery' ? (
                                        part.state === 'output-available' ? (
                                            <ResultMap elements={(part.output as { elements: OSMNode[] }).elements} />
                                        ) : (
                                            <div>[executeOverpassQuery] State: {part.state}</div>
                                        )
                                    ) : (
                                        <div>[UNKNOWN MESSAGE PART] {JSON.stringify(part)}</div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </li>
                ))}
            </div>

            <form
                className="flex gap-2"
                onSubmit={async e => {
                    e.preventDefault();
                    await sendChatMessage();
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
