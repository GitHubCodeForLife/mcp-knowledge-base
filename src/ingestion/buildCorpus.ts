import type { AppConfig } from "../config/loadConfig.js";
import { chunkText } from "./chunk.js";
import { discoverFiles } from "./discover.js";
import { extractText } from "./extract.js";

export interface CorpusChunk {
  id: string;
  relativePath: string;
  chunkIndex: number;
  text: string;
}

export async function buildCorpus(config: AppConfig): Promise<CorpusChunk[]> {
  const files = discoverFiles(config);
  const chunkSize = config.knowledge_base.ingestion.chunk_size;
  const overlap = config.knowledge_base.ingestion.chunk_overlap;
  const encoding = config.knowledge_base.ingestion.encoding;
  const corpus: CorpusChunk[] = [];

  for (const file of files) {
    let full: string;
    try {
      full = await extractText(file.absolutePath, file.extension, encoding);
    } catch (e) {
      console.error(
        `Failed to extract ${file.relativePath}: ${e instanceof Error ? e.message : String(e)}`,
      );
      continue;
    }
    const parts = chunkText(full, chunkSize, overlap);
    for (let i = 0; i < parts.length; i++) {
      corpus.push({
        id: `${file.relativePath}#${i}`,
        relativePath: file.relativePath,
        chunkIndex: i,
        text: parts[i].text,
      });
    }
  }
  return corpus;
}
