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
import { openai } from '@ai-sdk/openai';
import { executeOverpassQuery, mapFeatureWikiRAG, nominatimLocationSearch } from './tools';
import { CrawlOpenStreetMapWikiTagsWorkflow } from './workflows/crawlOpenStreetMapWikiTags';

const model = openai('gpt-4.1');

export class GeenieAgent extends AIChatAgent<Env> {
    private static readonly SYSTEM_PROMPT: string = `You are Geenie, a helpful assistant and map data expert.
Your ultimate goal is to convert a user's natural-language request into an Overpass QL query and execute it.

The Overpass QL query must contain an accurate bounding box or location matching the user's request.
Do not come up with the coordinates yourself! Instead, use the nominatimLocationSearch tool first.

Use the mapFeatureWikiRAG tool to look up known and common tags that are best suited for the user's request and are most likely to have results.
In the case of multiple tags describing a similar thing, use all those tags in the the Overpass query for the best result.

After having the correct bounding box or location, and a list of tags that are most likely to yield the results, generate a correct Overpass QL query.
Use the executeOverpassQuery tool to execute this Overpass QL query.
The results will then automatically be displayed on a map for the user, so don't ask him to display them.

In the final response, do not include the tool or function names.
Instead, just mention the number of results, and highlight the top 3 places of the response.
Do not use markdown formatting.
`.trim();

    async onChatMessage(
        onFinish: StreamTextOnFinishCallback<ToolSet>,
        options?: {
            abortSignal: AbortSignal | undefined;
        },
    ): Promise<Response | undefined> {
        const result = streamText({
            system: GeenieAgent.SYSTEM_PROMPT,
            messages: convertToModelMessages(this.messages),
            model,
            tools: {
                nominatimLocationSearch,
                executeOverpassQuery,
                mapFeatureWikiRAG: mapFeatureWikiRAG(this.env),
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

export { CrawlOpenStreetMapWikiTagsWorkflow };
