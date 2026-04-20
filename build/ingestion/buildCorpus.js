import { chunkText } from "./chunk.js";
import { discoverFiles } from "./discover.js";
import { extractText } from "./extract.js";
export async function buildCorpus(config) {
    const files = discoverFiles(config);
    const chunkSize = config.knowledge_base.ingestion.chunk_size;
    const overlap = config.knowledge_base.ingestion.chunk_overlap;
    const encoding = config.knowledge_base.ingestion.encoding;
    const corpus = [];
    for (const file of files) {
        let full;
        try {
            full = await extractText(file.absolutePath, file.extension, encoding);
        }
        catch (e) {
            console.error(`Failed to extract ${file.relativePath}: ${e instanceof Error ? e.message : String(e)}`);
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
