import type { AppConfig } from "../config/loadConfig.js";
export declare function extractText(absolutePath: string, extension: string, encoding: AppConfig["knowledge_base"]["ingestion"]["encoding"]): Promise<string>;
