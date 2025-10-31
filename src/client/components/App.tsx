import React, { useEffect, useState } from 'react';
import { useAgent } from 'agents/react';
import { useAgentChat } from 'agents/ai-react';
import type { UIMessage } from 'ai';
import { v4 as uuidv4 } from 'uuid';
import { ChatInput } from '@/client/components/ChatInput.tsx';
import { Chat } from '@/client/components/Chat.tsx';
import type { OSMElement } from '@/client/components/ResultMap.tsx';

type AgentState = Record<string, OSMElement[]>;

const LOCAL_STORAGE_SESSION_KEY = 'geenie-session-id';

export const App: React.FC = () => {
    const [overpassResults, setOverpassResults] = useState<AgentState>({});

    const agent = useAgent<AgentState>({
        agent: 'geenie-agent',
        name: localStorage.getItem(LOCAL_STORAGE_SESSION_KEY) ?? uuidv4(),
        onStateUpdate: results => setOverpassResults(results),
        onOpen: () => console.log('Connection to Geenie established'),
        onClose: () => console.log('Connection to Geenie closed'),
    });

    const agentChat = useAgentChat<AgentState, UIMessage>({ agent });

    useEffect(() => {
        localStorage.setItem(LOCAL_STORAGE_SESSION_KEY, agent.name);
    }, [agent]);

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

                    <div className="text-xs mt-2 text-center w-full inline-block">
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
