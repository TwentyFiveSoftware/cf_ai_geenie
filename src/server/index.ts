import { routeAgentRequest } from 'agents';
import { AIChatAgent } from 'agents/ai-chat-agent';
import {
    convertToModelMessages,
    createUIMessageStreamResponse,
    stepCountIs,
    streamText,
    type StreamTextOnFinishCallback,
    type ToolSet,
} from 'ai';
import { createWorkersAI } from 'workers-ai-provider';
import { executeOverpassQuery, nominatimLocationSearch } from './tools';

export class GeenieAgent extends AIChatAgent<Env> {
    private cloudflareWorkersAI = createWorkersAI({ binding: this.env.AI });

    private static SYSTEM_PROMPT: string = `You are Geenie, a helpful assistant and map data expert.
Your ultimate goal is to convert the user's natural-language request into an Overpass QL query.
Iterate and use the tools until you get a desired response!

The Overpass QL query must contain an accurate bounding box or location matching the user's request.
Do not come up with the coordinates yourself! Instead, use the nominatimLocationSearch tool first, before trying to generate an Overpass query.

After having the correct bounding box or location, generate a correct Overpass QL query using nodes/ways/relations with appropriate tags and the location.
Use the executeOverpassQuery tool to execute this Overpass QL query.

In the final response, do not include the tool or function names. Just highlight a few places of the response.
`;

    async onChatMessage(
        onFinish: StreamTextOnFinishCallback<ToolSet>,
        options?: {
            abortSignal: AbortSignal | undefined;
        },
    ): Promise<Response | undefined> {
        const result = streamText({
            system: GeenieAgent.SYSTEM_PROMPT,
            messages: convertToModelMessages(this.messages),
            model: this.cloudflareWorkersAI('@cf/meta/llama-3.3-70b-instruct-fp8-fast', { safePrompt: true }),
            tools: {
                nominatimLocationSearch,
                executeOverpassQuery,
            },
            onFinish,
            abortSignal: options?.abortSignal,
            stopWhen: stepCountIs(5),
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
