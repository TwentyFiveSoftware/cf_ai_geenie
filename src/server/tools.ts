import { z } from 'zod';
import type { Tool } from 'ai';

export const executeOverpassQuery = {
    description: `
Executes an OpenStreetMap Overpass QL query using the public Overpass API.

Use this tool to retrieve geographic and map-related data — such as roads, buildings, amenities, or other OpenStreetMap features — by running a custom Overpass QL query.
Always use the 'around' filter with a reasonable small radius.

The input **must** be a valid Overpass QL query string that includes an output directive of \`[out:json]\`.

Example:
\`\`\`
/*
This shows all mountains around a location (radius in meters, latitude, longitude).
*/
[out:json];
node
  [natural=peak]
  (around: 10000, 46.8, 10.8);
out;
\`\`\`
`.trim(),
    inputSchema: z.object({ query: z.string().describe('A valid Overpass QL query as a string.') }),
    execute: async ({ query }) => {
        console.log('"executeOverpassQuery"', query);

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
                throw new Error(`Overpass query resulted in an error: HTTP ${result.status}`);
            }

            return await result.json();
        }

        throw new Error(`Overpass API is too busy`);
    },
} satisfies Tool<{ query: string }, unknown>;

export const nominatimLocationSearch = {
    description: `
Looks up the coordinates of a given postal address using the OpenStreetMap Nominatim API.
This tool returns the latitude and longitude of the searched address.

Examples: "Amsterdam", "Time Square, New York"
`.trim(),
    inputSchema: z.object({ search: z.string().describe('postal address') }),
    execute: async ({ search }) => {
        console.log('"nominatimLocationSearch"', search);

        const result = await fetch(
            `https://nominatim.openstreetmap.org/search?polygon_geojson=0&limit=3&format=jsonv2&q=${encodeURIComponent(search)}`,
            {
                headers: {
                    'User-Agent': 'curl',
                },
            },
        );

        if (result.status !== 200) {
            throw new Error(`Nominatim query resulted in an error: HTTP ${result.status}`);
        }

        return await result.json();
    },
} satisfies Tool<{ search: string }, unknown>;

export const mapFeatureWikiRAG = (env: Env) =>
    ({
        description: `
Retrieve information from the OpenStreetMap wiki about the most common map features (i.e. tags with key and values) alongside their descriptions.
These key-value pairs are important for generating Overpass QL queries to actually return the desired map features.
`.trim(),
        inputSchema: z.object({
            mapFeature: z.string().describe('desired map feature for which to look up valid tags'),
        }),
        execute: async ({ mapFeature }) => {
            console.log('"mapFeatureWikiRAG"', mapFeature);

            const embedding = await env.AI.run('@cf/baai/bge-large-en-v1.5', { text: mapFeature });
            const vector = (embedding as { data: number[][] }).data[0]; // shape: [1, 1024]

            const { matches } = await env.VECTORIZE.query(vector, {
                namespace: 'map_features',
                topK: 3,
                returnMetadata: 'none',
                returnValues: false,
            });

            const stmt = env.prod_openstreetmap_wiki_tags.prepare(
                'SELECT content FROM map_features WHERE category = ? LIMIT 1',
            );

            const results = await Promise.all(matches.map(match => stmt.bind(match.id).first<string>('content')));
            return results.filter(content => content !== null);
        },
    }) satisfies Tool<{ mapFeature: string }, unknown>;
