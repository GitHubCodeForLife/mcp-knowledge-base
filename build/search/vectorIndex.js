function cosine(a, b) {
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
    chunks = [];
    add(record) {
        this.chunks.push(record);
    }
    search(queryEmbedding, topK) {
        const scored = this.chunks.map((c) => ({
            ...c,
            score: cosine(queryEmbedding, c.embedding),
        }));
        scored.sort((a, b) => b.score - a.score);
        return scored.slice(0, topK);
    }
    /** Dense cosine score for every chunk (for hybrid / MMR candidate pools). */
    allDenseScores(queryEmbedding) {
        return this.chunks.map((c) => ({
            ...c,
            score: cosine(queryEmbedding, c.embedding),
        }));
    }
    getChunkById(id) {
        return this.chunks.find((c) => c.id === id);
    }
    get chunkCount() {
        return this.chunks.length;
    }
}
export async function buildVectorIndex(items, embedder) {
    const index = new VectorIndex();
    if (items.length === 0)
        return index;
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
