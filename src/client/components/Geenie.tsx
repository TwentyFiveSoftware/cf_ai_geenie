import React, { useState } from 'react';
import { useAgent } from 'agents/react';
import { useAgentChat } from 'agents/ai-react';
import type { UIMessage } from 'ai';
import { ChatInput } from '@/client/components/ChatInput.tsx';
import { Chat } from '@/client/components/Chat.tsx';
import type { OSMElement } from '@/client/components/ResultMap.tsx';

type AgentState = Record<string, OSMElement[]>;

const EXAMPLE_QUERIES: string[] = [
    'Show me all peaks in Yosemite National Park',
    'Show all cafés around the Eiffel Tower',
    'Show all canals in the old town of Amsterdam, Netherlands',
    'Show the area of Yosemite National Park',
    "Map public restrooms in Stockholm's old town",
    'Map all hiking trails around Finse, Norway',
    'Show me the Geirangerfjord, Norway',
    'Show me all tourist huts in a 30km radius around Mayrhofen, Austria',
];

export const Geenie: React.FC<{ sessionID: string }> = ({ sessionID }) => {
    const [overpassResults, setOverpassResults] = useState<AgentState>({});
    const [exampleQuery] = useState<string>(EXAMPLE_QUERIES[Math.floor(Math.random() * EXAMPLE_QUERIES.length)]);

    const agent = useAgent<AgentState>({
        agent: 'geenie-agent',
        name: sessionID,
        onStateUpdate: results => setOverpassResults(results),
        onOpen: () => console.log('Connection to Geenie established'),
        onClose: () => console.log('Connection to Geenie closed'),
    });

    const agentChat = useAgentChat<AgentState, UIMessage>({ agent });

    const isAgentReadyForNextMessage = agentChat.status === 'ready';

    const sendChatMessage = (message: string) => {
        if (!isAgentReadyForNextMessage) {
            return;
        }

        agentChat.sendMessage({
            role: 'user',
            parts: [{ type: 'text', text: message }],
        });
    };

    const clearHistory = () => {
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
                    <div className="mb-10 text-center grid justify-items-center">
                        <div className="w-[80%]">
                            Explore the world through words — ask Geenie for any place, landmark, or point of interest,
                            and watch it appear.
                        </div>
                    </div>

                    <ChatInput placeholder={`e.g. "${exampleQuery}"`} sendChatMessage={sendChatMessage} />

                    <div className="text-xs mt-4 text-center w-full inline-block text-muted-foreground">
                        Important: The chat is shared with OpenAI. Do not enter personal or sensitive information!
                        <br />
                        For more details and the usage policy, please refer to the{' '}
                        <a
                            href="https://github.com/TwentyFiveSoftware/cf_ai_geenie"
                            className="underline cursor-pointer hover:text-primary"
                        >
                            GitHub page
                        </a>
                        .
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full h-svh grid grid-rows-[1fr_150px]">
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
                    <ChatInput
                        placeholder="Refine your query or ask follow-up questions"
                        sendChatMessage={sendChatMessage}
                    />

                    <div className="text-xs mt-2 text-center w-full inline-block">
                        Or delete this conversation and start over with a{' '}
                        <a className="underline cursor-pointer hover:text-primary" onClick={() => clearHistory()}>
                            new chat
                        </a>
                        .
                        <br />
                        Important: The chat is shared with OpenAI. Do not enter sensitive information — details on the
                        usage policy on the
                        <a
                            href="https://github.com/TwentyFiveSoftware/cf_ai_geenie"
                            className="underline cursor-pointer hover:text-primary"
                        >
                            GitHub page
                        </a>
                        .
                    </div>
                </div>
            </div>
        </div>
    );
};
