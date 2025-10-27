import { routeAgentRequest } from 'agents';
import { AIChatAgent } from 'agents/ai-chat-agent';
import {
    convertToModelMessages,
    createUIMessageStreamResponse,
    streamText,
    type StreamTextOnFinishCallback,
    type ToolSet,
} from 'ai';
import { createWorkersAI } from 'workers-ai-provider';
import { executeOverpassQuery } from './tools';

export class GeenieAgent extends AIChatAgent<Env> {
    private cloudflareWorkersAI = createWorkersAI({ binding: this.env.AI });

    private static SYSTEM_PROMPT: string = `You are "Geenie", a helpful assistant that can filter POI (point-of-interests) on an OpenStreetView map.`;

    async onChatMessage(
        onFinish: StreamTextOnFinishCallback<ToolSet>,
        options?: {
            abortSignal: AbortSignal | undefined;
        },
    ): Promise<Response | undefined> {
        const result = streamText({
            system: GeenieAgent.SYSTEM_PROMPT,
            messages: convertToModelMessages(this.messages),
            model: this.cloudflareWorkersAI('@cf/meta/llama-3.1-8b-instruct-fp8', { safePrompt: true }),
            tools: {
                executeOverpassQuery,
            },
            onFinish,
            abortSignal: options?.abortSignal,
        });

        return createUIMessageStreamResponse({
            stream: result.toUIMessageStream(),
        });
    }
}

export default {
    async fetch(request: Request, env: Env) {
        return (await routeAgentRequest(request, env)) || new Response('Not found', { status: 404 });
    },
} satisfies ExportedHandler<Env>;
