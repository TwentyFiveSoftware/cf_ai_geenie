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

Example 1: "Amsterdam"
Example 2: "Time Square, New York"
Negative Example (does not yield results): "Cafe in New York"
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
