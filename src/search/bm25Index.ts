/**
 * In-memory BM25 over chunk records (Okapi BM25).
 */

const K1 = 1.2;
const B = 0.75;

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 0);
}

export class Bm25Index {
  private readonly docIds: string[] = [];
  private readonly docLens: number[] = [];
  private readonly avgDl: number;
  /** term -> chunk id -> term frequency */
  private readonly postings = new Map<string, Map<string, number>>();
  private readonly N: number;
  private readonly idf = new Map<string, number>();

  private constructor(
    docIds: string[],
    docLens: number[],
    postings: Map<string, Map<string, number>>,
    avgDl: number,
  ) {
    this.docIds = docIds;
    this.docLens = docLens;
    this.postings = postings;
    this.avgDl = avgDl;
    this.N = docIds.length;
    for (const term of postings.keys()) {
      const df = postings.get(term)!.size;
      this.idf.set(
        term,
        Math.log(1 + (this.N - df + 0.5) / (df + 0.5)),
      );
    }
  }

  get docCount(): number {
    return this.N;
  }

  static fromChunks(
    chunks: Array<{ id: string; text: string }>,
  ): Bm25Index {
    if (chunks.length === 0) {
      return new Bm25Index([], [], new Map(), 0);
    }
    const docIds = chunks.map((c) => c.id);
    const docLens: number[] = [];
    const postings = new Map<string, Map<string, number>>();
    let lenSum = 0;
    for (const c of chunks) {
      const terms = tokenize(c.text);
      docLens.push(terms.length);
      lenSum += terms.length;
      const tf = new Map<string, number>();
      for (const t of terms) {
        tf.set(t, (tf.get(t) ?? 0) + 1);
      }
      for (const [term, f] of tf) {
        let m = postings.get(term);
        if (!m) {
          m = new Map();
          postings.set(term, m);
        }
        m.set(c.id, f);
      }
    }
    const avgDl = lenSum / chunks.length;
    return new Bm25Index(docIds, docLens, postings, avgDl);
  }

  /** Raw BM25 scores per chunk id for this query (sparse: only docs with query terms). */
  scoreQuery(query: string): Map<string, number> {
    const out = new Map<string, number>();
    if (this.N === 0) return out;
    const qTerms = tokenize(query);
    if (qTerms.length === 0) return out;

    const seenDoc = new Set<string>();
    for (const term of qTerms) {
      const idf = this.idf.get(term);
      if (idf === undefined) continue;
      const post = this.postings.get(term);
      if (!post) continue;
      for (const docId of post.keys()) {
        seenDoc.add(docId);
      }
    }

    const docIndex = new Map(this.docIds.map((id, i) => [id, i] as const));
    for (const docId of seenDoc) {
      const idx = docIndex.get(docId);
      if (idx === undefined) continue;
      const dl = this.docLens[idx] ?? 0;
      let score = 0;
      for (const term of qTerms) {
        const idf = this.idf.get(term);
        if (idf === undefined) continue;
        const f = this.postings.get(term)?.get(docId) ?? 0;
        if (f === 0) continue;
        const num = f * (K1 + 1);
        const den = f + K1 * (1 - B + (B * dl) / (this.avgDl || 1));
        score += idf * (num / den);
      }
      out.set(docId, score);
    }
    return out;
  }
}
