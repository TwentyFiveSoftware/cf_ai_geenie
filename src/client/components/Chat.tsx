import React from 'react';
import type { UIMessage } from 'ai';
import { type OSMNode, ResultMap } from '@/client/components/ResultMap.tsx';
import { DotIcon } from 'lucide-react';

type Props = {
    messages: UIMessage[];
    isWaitingForResponse: boolean;
};

export const Chat: React.FC<Props> = ({ messages, isWaitingForResponse }) => {
    return (
        <div className="flex flex-col gap-4 mb-10">
            {messages.map(message => {
                switch (message.role) {
                    case 'user':
                        return <UserMessage message={message} key={message.id} />;

                    case 'assistant':
                        return <AssistantMessage message={message} key={message.id} />;

                    case 'system':
                        return <></>;
                }
            })}

            <div>{isWaitingForResponse && <DotIcon className="stroke-8 animate-pulse" />}</div>
        </div>
    );
};

const UserMessage: React.FC<{ message: UIMessage }> = ({ message }) => {
    const text = message.parts
        .filter(part => part.type === 'text')
        .map(part => part.text)
        .join('; ');

    return (
        <div className="w-full flex justify-end mt-8">
            <div className="max-w-[70%] bg-muted px-5 py-2.5 rounded-xl">{text}</div>
        </div>
    );
};

const AssistantMessage: React.FC<{ message: UIMessage }> = ({ message }) => {
    return (
        <div className="w-full">
            {message.parts.map((part, index) => {
                switch (part.type) {
                    case 'text':
                        return part.text;

                    case 'step-start':
                        return index > 0 ? <div className="border-b-2" key={index} /> : <></>;

                    case 'tool-executeOverpassQuery':
                        switch (part.state) {
                            case 'input-streaming':
                                return <div key={part.toolCallId}>Generating Overpass query...</div>;

                            case 'input-available':
                                return <div key={part.toolCallId}>Executing Overpass query...</div>;

                            case 'output-available':
                                return (
                                    <ResultMap
                                        key={part.toolCallId}
                                        elements={(part.output as { elements: OSMNode[] }).elements}
                                    />
                                );

                            case 'output-error':
                                return (
                                    <div key={part.toolCallId} className="text-destructive">
                                        Error executing Overpass query: {part.errorText}

                                        <code className="block font-mono mt-3">
                                            {JSON.stringify(part.input)}
                                        </code>
                                    </div>
                                );

                            default:
                                return <></>;
                        }

                    default:
                        return <></>;
                }
            })}
        </div>
    );
};
