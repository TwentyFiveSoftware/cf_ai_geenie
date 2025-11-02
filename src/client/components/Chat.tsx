import React, { useCallback, useEffect, useRef } from 'react';
import type { ToolUIPart, UIMessage } from 'ai';
import { type OSMElement, ResultMap } from '@/client/components/ResultMap.tsx';
import { CircleAlert, CircleCheckIcon, CircleQuestionMarkIcon, DotIcon, LoaderCircleIcon } from 'lucide-react';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible.tsx';

type Props = {
    messages: UIMessage[];
    overpassResults: Record<string, OSMElement[]>;
    isWaitingForResponse: boolean;
};

export const Chat: React.FC<Props> = ({ messages, overpassResults, isWaitingForResponse }) => {
    const chatEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = useCallback(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, []);

    useEffect(() => {
        if (messages.length > 0) {
            scrollToBottom();
        }
    }, [messages, scrollToBottom]);

    return (
        <div className="flex flex-col gap-8 mb-10">
            {messages.map(message => {
                switch (message.role) {
                    case 'user':
                        return <UserMessage key={message.id} message={message} />;

                    case 'assistant':
                        return (
                            <AssistantMessage key={message.id} message={message} overpassResults={overpassResults} />
                        );

                    case 'system':
                        return <React.Fragment key={message.id} />;
                }
            })}

            <div>{isWaitingForResponse && <DotIcon className="stroke-8 animate-pulse" />}</div>

            <div ref={chatEndRef} />
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

const AssistantMessage: React.FC<{ message: UIMessage; overpassResults: Record<string, OSMElement[]> }> = ({
    message,
    overpassResults,
}) => {
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
                                        <ResultMap elements={overpassResults[part.toolCallId] ?? []} />
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

                    case 'tool-retrieveOpenStreetMapsTagsFromKnowledgeBase':
                        return (
                            <ToolMessagePart
                                key={part.toolCallId}
                                part={part}
                                runningStateText="Searching OpenStreetMap wiki for suitable tags..."
                                successStateText="Found suitable tags in the OpenStreetMap wiki"
                                errorStateText="OpenStreetMap wiki search resulted in an error"
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
            text = <div className="text-destructive">{errorStateText}</div>;
            break;
    }

    const toolInput = !part.input ? null : JSON.stringify(part.input, null, 2);
    const toolOutput = !part.output ? null : JSON.stringify(part.output, null, 2);

    return (
        <Collapsible>
            <CollapsibleTrigger>
                <div className="flex gap-3 cursor-pointer">
                    {icon} {text}
                </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
                <div className="pl-8">
                    <div className="border rounded-xl w-full p-5 mt-2 mb-5 grid gap-6">
                        {toolInput && (
                            <div>
                                <div className="mb-3 text-muted-foreground">Tool Input</div>
                                <code className="w-full p-4 bg-muted rounded-xl block font-mono break-all whitespace-pre-wrap">
                                    {toolInput}
                                </code>
                            </div>
                        )}

                        {toolOutput && (
                            <div>
                                <div className="mb-3 text-muted-foreground">Tool Output</div>
                                <code className="w-full p-4 bg-muted rounded-xl block font-mono break-all whitespace-pre-wrap">
                                    {toolOutput}
                                </code>
                            </div>
                        )}

                        {part.errorText && (
                            <div>
                                <div className="mb-3 text-muted-foreground">Tool Error</div>
                                <code className="w-full p-4 bg-muted rounded-xl block font-mono break-all whitespace-pre-wrap">
                                    {part.errorText}
                                </code>
                            </div>
                        )}
                    </div>
                </div>
            </CollapsibleContent>
        </Collapsible>
    );
};
