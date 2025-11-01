import { z } from 'zod';
import type { Tool } from 'ai';

export const executeOverpassQuery = (storeResultInState: (toolCallId: string, result: unknown) => void) =>
    ({
        description: `
Executes an OpenStreetMap Overpass QL query using the public Overpass API.
Use this tool to retrieve geographic and map-related data — such as roads, buildings, amenities, or other OpenStreetMap features.
The input **must** be a valid Overpass QL query string that includes an output directive of \`[out:json]\`.
`.trim(),
        inputSchema: z.object({ query: z.string().describe('A valid Overpass QL query as a string.') }),
        execute: async ({ query }, { toolCallId }) => {
            for (let retry = 0; retry < 3; retry++) {
                const result = await fetch('https://overpass-api.de/api/interpreter', {
                    method: 'POST',
                    body: `data=${encodeURIComponent(query)}`,
                });

                // retry if the API is too busy
                if (result.status === 504) {
                    continue;
                }

                if (result.status !== 200) {
                    throw new Error(
                        `Overpass query resulted in an error (HTTP ${result.status}):\n\n${await result.text()}`,
                    );
                }

                const jsonResult = (await result.json()) as { elements: unknown[] };
                storeResultInState(toolCallId, jsonResult.elements);

                return `Overpass query returned ${jsonResult.elements.length} results.`;
            }

            throw new Error(
                `Overpass API is too busy at the moment (tried multiple times, but all attempts failed with HTTP 504)`,
            );
        },
    }) satisfies Tool<{ query: string }, unknown>;

export const nominatimLocationSearch = {
    description: `
Looks up the coordinates of a given postal address using the OpenStreetMap Nominatim API.
This tool returns the latitude and longitude of the searched address.
Examples: "Amsterdam", "Time Square, New York"
`.trim(),
    inputSchema: z.object({ search: z.string().describe('postal address') }),
    execute: async ({ search }) => {
        const result = await fetch(
            `https://nominatim.openstreetmap.org/search?polygon_geojson=0&limit=1&format=jsonv2&q=${encodeURIComponent(search)}`,
            {
                headers: {
                    'User-Agent': 'curl',
                },
            },
        );

        if (result.status !== 200) {
            throw new Error(`Nominatim query resulted in an error (HTTP ${result.status}):\n\n${await result.text()}`);
        }

        return await result.json();
    },
} satisfies Tool<{ search: string }, unknown>;

export const retrieveOpenStreetMapsTagsFromKnowledgeBase = (env: Env) =>
    ({
        description: `
Retrieve information from the OpenStreetMap wiki about the most common map features (i.e. OpenStreetMap tags with key, values, and descriptions).
These key-value pairs are important for generating Overpass QL queries to actually return the desired map features.
`.trim(),
        inputSchema: z.object({
            mapFeature: z.string().describe('desired map feature for which to look up valid tags'),
        }),
        execute: async ({ mapFeature }) => {
            const embedding = await env.AI.run('@cf/baai/bge-base-en-v1.5', { text: mapFeature });
            const vector = (embedding as { data: number[][] }).data[0]; // shape: [1, 768]

            const { matches } = await env.VECTORIZE.query(vector, {
                namespace: 'tags',
                topK: 5,
                returnMetadata: 'all',
                returnValues: false,
            });

            return matches.map(match => match.metadata);
        },
    }) satisfies Tool<{ mapFeature: string }, unknown>;
