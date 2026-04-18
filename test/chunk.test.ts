import { describe, expect, it } from "vitest";
import { chunkText } from "../src/ingestion/chunk.js";

describe("chunkText", () => {
  it("splits with overlap", () => {
    const text = "a".repeat(100);
    const chunks = chunkText(text, 30, 10);
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[0].text.length).toBe(30);
  });
});
