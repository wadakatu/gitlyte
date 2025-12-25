/**
 * Shared constants for GitLyte
 */

/**
 * Marker to identify GitLyte-generated commits and prevent infinite loops.
 * When this marker is present in a commit message, GitLyte will skip processing.
 */
export const GITLYTE_COMMIT_MARKER = "[skip gitlyte]";
