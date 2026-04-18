export interface Embedder {
  embedQuery(text: string): Promise<number[]>;
  embedDocuments(texts: string[]): Promise<number[][]>;
}

/** Deterministic bag-of-characters vectors for offline or tests (not true semantic). */
export function createHashEmbedder(dim = 256): Embedder {
  const embedOne = (text: string): number[] => {
    const v = new Array(dim).fill(0);
    for (let i = 0; i < text.length; i++) {
      const c = text.charCodeAt(i) % dim;
      v[c] += 1;
    }
    const norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0)) || 1;
    return v.map((x) => x / norm);
  };
  return {
    async embedQuery(text: string) {
      return embedOne(text);
    },
    async embedDocuments(texts: string[]) {
      return texts.map(embedOne);
    },
  };
}

export function createOpenAiEmbedder(options: {
  apiKey: string;
  model?: string;
}): Embedder {
  const model = options.model ?? "text-embedding-3-small";
  const url = "https://api.openai.com/v1/embeddings";

  async function embedBatch(inputs: string[]): Promise<number[][]> {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${options.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model, input: inputs }),
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`OpenAI embeddings failed: ${res.status} ${errText}`);
    }
    const json = (await res.json()) as {
      data: Array<{ embedding: number[]; index: number }>;
    };
    const sorted = [...json.data].sort((a, b) => a.index - b.index);
    return sorted.map((d) => d.embedding);
  }

  return {
    async embedQuery(text: string) {
      const [vec] = await embedBatch([text]);
      return vec;
    },
    async embedDocuments(texts: string[]) {
      if (texts.length === 0) return [];
      const out: number[][] = [];
      const batchSize = 64;
      for (let i = 0; i < texts.length; i += batchSize) {
        const batch = texts.slice(i, i + batchSize);
        const part = await embedBatch(batch);
        out.push(...part);
      }
      return out;
    },
  };
}

export function createEmbedderFromEnv(): Embedder {
  const key = process.env.OPENAI_API_KEY;
  if (key) {
    return createOpenAiEmbedder({
      apiKey: key,
      model: process.env.OPENAI_EMBEDDING_MODEL,
    });
  }
  return createHashEmbedder();
}
