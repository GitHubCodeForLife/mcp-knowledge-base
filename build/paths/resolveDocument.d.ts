import type { AppConfig } from "../config/loadConfig.js";
/**
 * Resolve a user-provided filename to a file under configured knowledge roots.
 * Accepts relative paths like `notes/a.md` or a basename if uniquely matching.
 */
export declare function resolveDocumentPath(config: AppConfig, filename: string): {
    absolutePath: string;
    relativePath: string;
};
