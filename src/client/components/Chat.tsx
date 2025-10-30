import React from 'react';
import type { ToolUIPart, UIMessage } from 'ai';
import { type MapElement, ResultMap } from '@/client/components/ResultMap.tsx';
import { CircleAlert, CircleCheckIcon, CircleQuestionMarkIcon, DotIcon, LoaderCircleIcon } from 'lucide-react';
import { cn } from '@/lib/utils.ts';

type Props = {
    messages: UIMessage[];
    isWaitingForResponse: boolean;
};

export const Chat: React.FC<Props> = ({ messages, isWaitingForResponse }) => {
    return (
        <div className="flex flex-col gap-8 mb-10">
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
        <div className="w-full grid gap-3">
            {message.parts.map((part, index) => {
                switch (part.type) {
                    case 'text':
                        return (
                            <div className="w-full whitespace-pre-wrap text-wrap" key={index}>
                                {part.text}
                            </div>
                        );

                    case 'tool-executeOverpassQuery':
                        return (
                            <div key={part.toolCallId}>
                                <ToolMessagePart
                                    part={part}
                                    runningStateText="Executing Overpass query..."
                                    successStateText="Overpass query executed"
                                    errorStateText="Overpass query resulted in an error"
                                />

                                {part.state === 'output-available' && (
                                    <div className="mt-5 mb-2">
                                        <ResultMap elements={(part.output as { elements: MapElement[] }).elements} />
                                    </div>
                                )}
                            </div>
                        );

                    case 'tool-nominatimLocationSearch':
                        return (
                            <ToolMessagePart
                                key={part.toolCallId}
                                part={part}
                                runningStateText="Executing Nominatim location search query..."
                                successStateText="Retrieved location coordiantes using Nominatim"
                                errorStateText="Nominatim location search resulted in an error"
                            />
                        );

                    case 'tool-mapFeatureWikiRAG':
                        return (
                            <ToolMessagePart
                                key={part.toolCallId}
                                part={part}
                                runningStateText="Searching OpenStreetMap Wiki for suitable tags..."
                                successStateText="Found suitable tags in the OpenStreetMap Wiki"
                                errorStateText="OpenStreetMap Wiki search resulted in an error"
                            />
                        );

                    case 'step-start':
                        return <React.Fragment key={index} />;

                    default:
                        return (
                            <div key={index}>
                                [UNKNOWN PART TYPE: {part.type}] {JSON.stringify(part)}
                            </div>
                        );
                }
            })}
        </div>
    );
};

const ToolMessagePart: React.FC<{
    part: ToolUIPart;
    runningStateText: string;
    successStateText: string;
    errorStateText: string;
}> = ({ part, runningStateText, successStateText, errorStateText }) => {
    let icon = <CircleQuestionMarkIcon />;
    let text = <div>...</div>;

    switch (part.state) {
        case 'input-streaming':
        case 'input-available':
            icon = <LoaderCircleIcon className="stroke-blue-400 animate-spin" />;
            text = <div className="text-blue-400">{runningStateText}</div>;
            break;

        case 'output-available':
            icon = <CircleCheckIcon className="stroke-blue-400" />;
            text = <div className="text-blue-400">{successStateText}</div>;
            break;

        case 'output-error':
            icon = <CircleAlert className="stroke-destructive" />;
            text = (
                <div className="text-destructive">
                    <span>
                        {errorStateText}: {part.errorText}
                    </span>
                    <code className="block font-mono mt-3">{JSON.stringify(part.input)}</code>
                </div>
            );
            break;
    }

    return (
        <div className="flex gap-3">
            {icon} {text}
        </div>
    );
};
