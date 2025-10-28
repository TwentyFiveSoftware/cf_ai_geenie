import { z } from 'zod';
import type { Tool } from 'ai';

export const executeOverpassQuery = {
    description: `
Executes an OpenStreetMap Overpass QL query using the public Overpass API.

Use this tool to retrieve geographic and map-related data — such as roads, buildings, amenities, or other OpenStreetMap features — by running a custom Overpass QL query.

The input **must** be a valid Overpass QL query string that includes an output directive of \`[out:json]\`.

Example:
\`\`\`
/*
This shows all mountains (peaks) in a bounding box (south, west, north, east).
*/
[out:json];
node
  [natural=peak]
  (46.740285, 10.710967, 46.887668, 10.964069);
out;
\`\`\`
`.trim(),
    inputSchema: z.object({ query: z.string().describe('A valid Overpass QL query as a string.') }),
    execute: async ({ query }) => {
        console.log('"executeOverpassQuery"', query);

        const result = await fetch('https://overpass-api.de/api/interpreter', {
            method: 'POST',
            body: `data=${encodeURIComponent(query)}`,
        });

        if (result.status !== 200) {
            throw new Error(`Overpass query resulted in an error: HTTP ${result.status}`);
        }

        return await result.json();
    },
} satisfies Tool<{ query: string }, unknown>;

export const nominatimLocationSearch = {
    description: `
Looks up the coordinates of a given postal address using the OpenStreetMap Nominatim API.
This tool returns the latitude, longitude, and the bounding box.

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
