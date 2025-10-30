import { WorkflowEntrypoint, WorkflowStep, WorkflowEvent } from 'cloudflare:workers';
import crypto from 'crypto';
import * as cheerio from 'cheerio';

// embeds the tags (key + value + description) from https://wiki.openstreetmap.org/wiki/Map_features
// note: cannot fetch wiki page directly because it needs JavaScript to fully load and is very large
// thus, HTML needs to be downloaded manually and is stored in D1 (not R2, since R2 needs Paid Tier)
export class CrawlOpenStreetMapWikiTagsWorkflow extends WorkflowEntrypoint<Env, Params> {
    async run(_: WorkflowEvent<Params>, step: WorkflowStep) {
        // manual step 0: download wiki page and insert as row into D1 table

        const mapFeatures = await step.do('fetch raw wiki page from D1 and extract content', async () => {
            const { results } = await this.env.prod_openstreetmap_wiki_tags
                .prepare('SELECT html FROM wiki_html ORDER BY downloaded_at_unix_time DESC LIMIT 1')
                .run();

            if (results.length === 0) {
                throw new Error('no HTML in D1 table');
            }

            const html = results[0].html as string;

            const sectionsHeadings = [];

            const matches = html.matchAll(/<h3>([^<]+)<\/h3>/gi);
            for (const match of matches) {
                sectionsHeadings.push({ heading: match[1].trim(), startIndex: match.index });
            }

            const mapFeatures = [];

            // note: the last 8 headings are not related to tags, so they can be ignored
            for (let i = 0; i < sectionsHeadings.length - 8; i++) {
                const content = html.slice(sectionsHeadings[i].startIndex, sectionsHeadings[i + 1].startIndex);

                const $ = cheerio.load(content);

                const category = sectionsHeadings[i].heading;
                const categoryDescription = $('p').first().text().trim();

                const tags = $('table tr')
                    .map((_, row) => {
                        const [key, value, , description] = $(row)
                            .children()
                            .map((_, cell) => $(cell).text())
                            .toArray();

                        return { key: key?.trim(), value: value?.trim(), description: description?.trim() };
                    })
                    .toArray()
                    .slice(1)
                    .filter(tag => tag.key && tag.value && tag.description);

                mapFeatures.push(
                    ...tags.map(tag => ({
                        key: tag.key,
                        value: tag.value,
                        description: tag.description,
                        category,
                        categoryDescription,
                    })),
                );
            }

            return mapFeatures.reverse();
        });

        await step.do('generate embeddings and insert into vectorize', async () => {
            for (const mapFeature of mapFeatures) {
                try {
                    const id = crypto.createHash('md5').update(`${mapFeature.key}|${mapFeature.value}`).digest('hex');
                    console.log(id);

                    const embedding = await this.env.AI.run('@cf/baai/bge-base-en-v1.5', {
                        text: JSON.stringify(mapFeature),
                    });
                    const vector = (embedding as { data: number[][] }).data[0]; // shape: [1, 768]

                    await this.env.VECTORIZE.upsert([
                        {
                            id,
                            namespace: 'map_features',
                            values: vector,
                            metadata: mapFeature,
                        },
                    ]);
                } catch (err) {
                    console.error(err);
                }
            }
        });
    }
}
