import React, { useState } from 'react';
import { useAgent } from 'agents/react';
import { useAgentChat } from 'agents/ai-react';
import type { UIMessage } from 'ai';
import { ChatInput } from '@/client/components/ChatInput.tsx';
import { Chat } from '@/client/components/Chat.tsx';
import type { MapElement } from '@/client/components/ResultMap.tsx';

type AgentState = Record<string, MapElement[]>;

export const App: React.FC = () => {
    const [overpassResults, setOverpassResults] = useState<AgentState>({});

    const agent = useAgent<AgentState>({
        agent: 'geenie-agent',
        name: 'session-12345', // TODO
        onStateUpdate: results => setOverpassResults(results),
        onOpen: () => console.log('Connection to Geenie established'),
        onClose: () => console.log('Connection to Geenie closed'),
    });

    const agentChat = useAgentChat<AgentState, UIMessage>({ agent });

    const isAgentReadyForNextMessage = agentChat.status === 'ready';

    const sendChatMessage = async (message: string) => {
        if (!isAgentReadyForNextMessage) {
            return;
        }

        agentChat.sendMessage({
            role: 'user',
            parts: [{ type: 'text', text: message }],
        });
    };

    const clearHistory = async () => {
        agentChat.clearHistory();
        agent.setState({});
    };

    if (agentChat.messages.length === 0) {
        return (
            <div className="w-full h-svh grid items-center justify-items-center p-4">
                <div className="w-full max-w-[750px] mb-10">
                    <h1 className="text-5xl font-bold text-center mb-2 text-blue-400">
                        Geenie<span className="text-primary">.</span>
                    </h1>
                    <div className="mb-10 text-center text-muted-foreground grid justify-items-center">
                        <div className="w-[80%]">
                            Explore the world through words — ask Geenie for any place, landmark, or point of interest,
                            and watch it appear.
                        </div>
                    </div>

                    <ChatInput sendChatMessage={sendChatMessage} />
                </div>
            </div>
        );
    }

    return (
        <div className="w-full h-svh grid grid-rows-[1fr_120px]">
            <div
                className="overflow-auto grid justify-items-center p-4"
                style={{ scrollbarGutter: 'stable both-edges' }}
            >
                <div className="w-full max-w-[750px]">
                    <h1 className="text-4xl font-bold my-4 text-blue-400">
                        Geenie<span className="text-primary">.</span>
                    </h1>

                    <Chat
                        messages={agentChat.messages}
                        overpassResults={overpassResults}
                        isWaitingForResponse={agentChat.status === 'submitted'}
                    />
                </div>
            </div>

            <div className="grid justify-items-center p-4">
                <div className="w-full max-w-[750px]">
                    <ChatInput sendChatMessage={sendChatMessage} />

                    <div className="text-xs ml-5 mt-2 text-center w-full inline-block">
                        or start over with{' '}
                        <a className="underline cursor-pointer hover:text-primary" onClick={() => clearHistory()}>
                            new chat
                        </a>
                        , deleting this conversation.
                    </div>
                </div>
            </div>
        </div>
    );
};
