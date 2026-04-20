import type { Embedder } from "../embeddings/embedder.js";

export interface ChunkRecord {
  id: string;
  relativePath: string;
  chunkIndex: number;
  text: string;
  embedding: number[];
}

function cosine(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom === 0 ? 0 : dot / denom;
}

export class VectorIndex {
  private readonly chunks: ChunkRecord[] = [];

  add(record: Omit<ChunkRecord, "embedding"> & { embedding: number[] }): void {
    this.chunks.push(record as ChunkRecord);
  }

  search(queryEmbedding: number[], topK: number): Array<ChunkRecord & { score: number }> {
    const scored = this.chunks.map((c) => ({
      ...c,
      score: cosine(queryEmbedding, c.embedding),
    }));
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, topK);
  }

  /** Dense cosine score for every chunk (for hybrid / MMR candidate pools). */
  allDenseScores(queryEmbedding: number[]): Array<ChunkRecord & { score: number }> {
    return this.chunks.map((c) => ({
      ...c,
      score: cosine(queryEmbedding, c.embedding),
    }));
  }

  getChunkById(id: string): ChunkRecord | undefined {
    return this.chunks.find((c) => c.id === id);
  }

  get chunkCount(): number {
    return this.chunks.length;
  }
}

export async function buildVectorIndex(
  items: Array<{
    id: string;
    relativePath: string;
    chunkIndex: number;
    text: string;
  }>,
  embedder: Embedder,
): Promise<VectorIndex> {
  const index = new VectorIndex();
  if (items.length === 0) return index;
  const texts = items.map((i) => i.text);
  const vectors = await embedder.embedDocuments(texts);
  for (let i = 0; i < items.length; i++) {
    index.add({
      ...items[i],
      embedding: vectors[i] ?? [],
    });
  }
  return index;
}
