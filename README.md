# Geenie

**Geenie** helps you explore the world through words — ask for any place, landmark, or point of interest, and it will find and map it for you.

Powered by **OpenStreetMap**'s **Overpass** and **Nominatim** APIs, this AI agent transforms natural language queries into real geospatial data and visualizations.
The agent can be accessed using a chat interface, allowing users to refine their query or ask follow-up questions.

Example Queries:
- "Show all cafés around the Eiffel Tower"
- "Show all canals in the old town of Amsterdam, Netherlands"
- "Show the area of the Yosemite National Park"


## Free Access

You can access Geenie for free at `TODO`.

However, note that data sharing with OpenAI is enabled.
Therefore, please do not enter personal or sensitive information in the chat.

The deployment has a limited number of OpenAI tokens available, so use them fairly.
Thus, the availability of this deployment may be limited by this.
Additionally, the agent uses the free Nominatim and Overpass APIs, which MUST also be used in a fair way to respect their usage policies - so please keep your calm.
Lastly, the availability of the entire deployment is limited by the Cloudflare free plan, which is very generous, but not infinite.


## Architecture

The agent runs on **Cloudflare Agents**, uses **OpenAI's GPT-4.1** as LLM, has an external knowledge base stored in **Cloudflare's Vectorize**, and has three tools available:

- **Execute Overpass Query**: Generates and executes [Overpass API](https://wiki.openstreetmap.org/wiki/Overpass_API) queries (in Overpass QL) to fetch map features from OpenStreetMap.
  The results of this tool are stored in the agent's state and visualized in the frontend.
- **Nominatim Location Search**: Queries the [Nominatim API](https://wiki.openstreetmap.org/wiki/Nominatim) to search OpenStreetMap for locations or addresses and returns coordinates and metadata.
- **Retrieve OpenStreetMaps Tags From Knowledge Base**: Looks up OpenStreetMap tags that best fit the user's search query.
  These tags are stored as embeddings in **Cloudflare's Vectorize** vector database.
  This database is populated using a **Cloudflare Workflow** that first crawls the tags from the [OpenStreetMap wiki page](https://wiki.openstreetmap.org/wiki/Map_features)
  using **Cloudflare Browser Rendering**, and then generates corresponding embeddings using the **@cf/baai/bge-base-en-v1.5** model run on **Cloudflare AI**.

The agent is instructed to
1. first, look up the relevant coordinates of the desired place using Nominatim,
2. then, retrieving relevant tags from the embedded wiki page,
3. and finally uses all gathered information to generate an Overpass QL query that is executed using the Overpass API.

The result is visualized in the chat on a Leaflet map with an OpenStreetMap tile layer.
It is capable of displaying everything from markers (e.g., for mountain peaks) to lines (e.g., for rivers) to areas (e.g., for a national park).
This enables the agent to generate all types of Overpass queries, returning a wide range of geospatial data.

You can inspect all tool inputs and outputs in the chat by clicking on the respective tool call.


## Deployment

First, create an OpenAI API key and add it to the `.env` file (fill in the `.env.dist`).

Next, you need to create a **Cloudflare Pages** project:
```shell
wrangler pages project create geenie
```

Additionally, you need to create a **Cloudflare Vectorize** database:

```shell
wrangler vectorize create prod-openstreetmap-wiki --preset @cf/baai/bge-base-en-v1.5
```

Finally, the worker including the AI agent can be deployed using
```shell
npm run deploy:workers
```

The frontend can be deployed to **Cloudflare Pages** using
```shell
npm run build
npm run deploy:pages
```

### Building the RAG Index

As described in the architecture section, the OpenStreetMap tags are crawled from the OpenStreetMap wiki page, embedded, and stored in Vectorize using a workflow.
The workflow can be triggered manually in the Cloudflare dashboard or using the following command:

```shell
wrangler workflows trigger crawl-openstreetmap-wiki-tags
```

**Important Note**: The workflow requires far more than the 30 seconds CPU time available in the free plan.
As a solution to stay in the free plan, execute the workflow locally
(uncomment the route for triggering the workflow in `src/server/index.ts`, since the workflow trigger command does not work locally).

After executing the workflow, you can verify the number of vectors in the vector database in the Cloudflare Dashboard, or using
```shell
wrangler vectorize info prod-openstreetmap-wiki
```

## Local Development

First, create an OpenAI API key and add it to the `.env` file (fill in the `.env.dist`).
Then, run the frontend and workers locally using

```shell
npm run dev
npm run dev:workers
```

## Credit

Credit to **OpenStreetMap** with its amazing free API and services, and huge thanks to Cloudflare for the generous free tier that makes this deployment possible.

Note that to gain [free OpenAI credits](https://help.openai.com/en/articles/10306912-sharing-feedback-evaluation-and-fine-tuning-data-and-api-inputs-and-outputs-with-openai),
making this deployment possible, data sharing of inputs and outputs with OpenAI is enabled.
Please keep in mind not to share any personal or sensitive information with the agent.
