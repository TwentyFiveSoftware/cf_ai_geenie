import { WorkflowEntrypoint, WorkflowStep, WorkflowEvent } from 'cloudflare:workers';
import puppeteer from '@cloudflare/puppeteer';
import crypto from 'crypto';

export class CrawlOpenStreetMapWikiTagsWorkflow extends WorkflowEntrypoint<Env, Params> {
    async run(_: WorkflowEvent<Params>, step: WorkflowStep) {
        const tags = await step.do('fetch wiki page and extract content', { timeout: '5 minute' }, async () => {
            const browser = await puppeteer.launch(this.env.BROWSER, { location: 'DE' });
            const page = await browser.newPage();
            await page.goto('https://wiki.openstreetmap.org/wiki/Map_features', {
                waitUntil: 'networkidle0',
                timeout: 60000,
            });

            const rows = await page.$$('table > tbody > tr');

            const tags: Tag[] = [];

            for (const row of rows) {
                const [key, value, description1, description2] = await row.$$eval('td', cells =>
                    cells.map(cell => cell.textContent),
                );

                const description = !description2 || description2.trim().length === 0 ? description1 : description2;

                if (!key || !value || !description) {
                    continue;
                }

                tags.push({ key: key.trim(), value: value.trim(), description: description.trim() } satisfies Tag);
            }

            await browser.close();

            return tags;
        });

        await step.do('generate embeddings and insert into vectorize', { timeout: '5 hour' }, async () => {
            for (let i = 0; i < tags.length; i++) {
                const tag = tags[i];

                try {
                    const id = crypto.createHash('md5').update(`${tag.key}|${tag.value}`).digest('hex');
                    console.log(`${i + 1} / ${tags.length}: ${id}`);

                    const embedding = await this.env.AI.run('@cf/baai/bge-base-en-v1.5', {
                        text: JSON.stringify(tag),
                    });
                    const vector = (embedding as { data: number[][] }).data[0]; // shape: [1, 768]

                    await this.env.VECTORIZE.upsert([
                        {
                            id,
                            namespace: 'tags',
                            values: vector,
                            metadata: tag,
                        },
                    ]);
                } catch (err) {
                    console.error(err);
                }
            }
        });
    }
}

type Tag = {
    key: string;
    value: string;
    description: string;
};
