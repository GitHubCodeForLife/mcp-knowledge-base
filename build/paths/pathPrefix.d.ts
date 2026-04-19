/**
 * Validate and normalize a path prefix for filtering search hits (relative POSIX paths under knowledge roots).
 */
export declare function normalizePathPrefix(prefix: string | undefined): string | undefined;
export declare function matchesPathPrefix(relativePath: string, prefix: string | undefined): boolean;
