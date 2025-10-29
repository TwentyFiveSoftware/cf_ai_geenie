import { WorkflowEntrypoint, WorkflowStep, WorkflowEvent } from 'cloudflare:workers';

export class CrawlOpenStreetMapWikiTagsWorkflow extends WorkflowEntrypoint<Env, Params> {
    async run(_: WorkflowEvent<Params>, step: WorkflowStep) {
        await step.do('fetch raw OpenStreetMap wiki site from D1', async () => {
            const { results } = await this.env.prod_openstreetmap_wiki_tags
                .prepare('SELECT html FROM wiki_html ORDER BY downloaded_at_unix_time DESC LIMIT 1')
                .run();

            if (results.length === 0) {
                throw new Error('no html in D1 table');
            }

            const html = results[0].html as string;

            const sectionsHeadings = [];

            const matches = html.matchAll(/<h3>([^<]+)<\/h3>/gi);
            for (const match of matches) {
                sectionsHeadings.push({ heading: match[1], startIndex: match.index });
            }

            const sections = [];

            // note: the last 8 headings are not related to tags, so they can be ignored
            for (let i = 0; i < sectionsHeadings.length - 8; i++) {
                const content = html.slice(sectionsHeadings[i].startIndex, sectionsHeadings[i + 1].startIndex);
                sections.push({ category: sectionsHeadings[i].heading, content });
            }

            const vectors: VectorizeVector[] = [];

            for (const section of sections) {
                await this.env.prod_openstreetmap_wiki_tags
                    .prepare('INSERT OR IGNORE INTO map_features (category, content) VALUES (?, ?)')
                    .bind(section.category, section.content)
                    .run();

                const embedding = await this.env.AI.run('@cf/baai/bge-large-en-v1.5', { text: section.content });
                const vector = (embedding as { data: number[][] }).data[0]; // shape: [1, 1024]
                vectors.push({ id: `${section.category}`, values: vector, namespace: 'map_features' });
            }

            await this.env.VECTORIZE.upsert(vectors);
        });
    }
}
