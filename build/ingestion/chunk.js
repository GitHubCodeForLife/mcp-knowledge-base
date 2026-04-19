/**
 * Non-overlapping windows with optional overlap between consecutive chunks.
 */
export function chunkText(fullText, chunkSize, chunkOverlap) {
    if (chunkSize <= 0) {
        throw new Error("chunk_size must be positive");
    }
    if (chunkOverlap < 0 || chunkOverlap >= chunkSize) {
        throw new Error("chunk_overlap must be >= 0 and < chunk_size");
    }
    const chunks = [];
    let start = 0;
    while (start < fullText.length) {
        const end = Math.min(start + chunkSize, fullText.length);
        chunks.push({
            text: fullText.slice(start, end),
            start,
            end,
        });
        if (end >= fullText.length)
            break;
        start = end - chunkOverlap;
        if (start < 0)
            start = 0;
    }
    return chunks;
}
