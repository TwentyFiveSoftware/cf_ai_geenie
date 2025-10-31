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

type OverpassResults = Record<string, unknown>;

export class GeenieAgent extends AIChatAgent<Env, OverpassResults> {
    private static readonly SYSTEM_PROMPT: string = `
You are Geenie, a helpful assistant and map data expert.
Your ultimate goal is to convert a user's natural-language request into an Overpass QL query and execute it.

The Overpass QL query must contain an accurate bounding box or location matching the user's request.
Do not come up with the coordinates yourself! Instead, use the nominatimLocationSearch tool first.
If the nominatimLocationSearch tool returns no result, try to generalize the search address.

Use the mapFeatureWikiRAG tool to look up known and common tags that are best suited for the user's request and are most likely to have results.
In the case of multiple tags describing a similar thing, use all those tags in the the Overpass query for the best result.

After having the correct bounding box or location, and a list of tags that are most likely to yield the results, generate a correct Overpass QL query.
Use the executeOverpassQuery tool to execute this Overpass QL query.
The results of the executeOverpassQuery tool will automatically be displayed for the user on an interactive map.

In the final response, do not include the tool or function names.
Give a very short summary of the result, such as mentioning the type, the size of the area or radius, and the number of places found.
Do not use markdown formatting.
`.trim();

    initialState = {} satisfies OverpassResults;

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
                executeOverpassQuery: executeOverpassQuery((toolCallId, result) =>
                    this.setState({
                        ...this.state,
                        [toolCallId]: result,
                    }),
                ),
                mapFeatureWikiRAG: mapFeatureWikiRAG(this.env),
            },
            onFinish,
            abortSignal: options?.abortSignal,
            stopWhen: stepCountIs(10),
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
