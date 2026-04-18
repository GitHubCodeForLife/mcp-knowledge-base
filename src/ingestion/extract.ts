import fs from "node:fs";
import type { AppConfig } from "../config/loadConfig.js";

export async function extractText(
  absolutePath: string,
  extension: string,
  encoding: AppConfig["knowledge_base"]["ingestion"]["encoding"],
): Promise<string> {
  if (extension === ".txt" || extension === ".md") {
    return fs.readFileSync(absolutePath, { encoding: encoding as BufferEncoding });
  }
  if (extension === ".pdf") {
    const { PDFParse } = await import("pdf-parse");
    const buf = fs.readFileSync(absolutePath);
    const parser = new PDFParse({ data: new Uint8Array(buf) });
    try {
      const result = await parser.getText();
      return result.text ?? "";
    } finally {
      await parser.destroy();
    }
  }
  throw new Error(`Unsupported extension for extraction: ${extension}`);
}
