import type { AppConfig } from "../config/loadConfig.js";
export interface DiscoveredFile {
    /** Path relative to the knowledge source root */
    relativePath: string;
    absolutePath: string;
    extension: string;
}
export declare function discoverFiles(config: AppConfig): DiscoveredFile[];
