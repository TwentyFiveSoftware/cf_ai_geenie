import React from 'react';
import { useAgent } from 'agents/react';
import { useAgentChat } from 'agents/ai-react';
import type { UIMessage } from 'ai';
import { ChatInput } from '@/client/components/ChatInput.tsx';
import { Chat } from '@/client/components/Chat.tsx';

export const App: React.FC = () => {
    const agent = useAgent({
        agent: 'geenie-agent',
        name: 'session-12345', // TODO
        onOpen: () => console.log('Connection to Geenie established'),
        onClose: () => console.log('Connection to Geenie closed'),
    });

    const agentChat = useAgentChat<unknown, UIMessage>({ agent });

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

    // const clearHistory = async () => {
    //     agentChat.clearHistory();
    // };

    return (
        <div className="w-full h-svh grid grid-rows-[1fr_120px]">
            <div
                className="overflow-auto grid justify-items-center p-4"
                style={{ scrollbarGutter: 'stable both-edges' }}
            >
                <div className="w-full max-w-[750px]">
                    <h1 className="text-4xl font-bold my-4">Geenie.</h1>

                    <Chat messages={agentChat.messages} isWaitingForResponse={agentChat.status === 'submitted'} />
                </div>
            </div>

            <div className="grid justify-items-center p-4">
                <div className="w-full max-w-[750px]">
                    <ChatInput sendChatMessage={sendChatMessage} />
                </div>
            </div>
        </div>
    );
};
