import "server-only";

export function profileCacheTag(userId: string) {
  return `profile:${userId}`;
}

export function workspaceCacheTag(workspaceId: string) {
  return `workspace:${workspaceId}:details`;
}

export function workspaceAnalyticsCacheTag(workspaceId: string) {
  return `workspace:${workspaceId}:analytics`;
}

export function analysisCacheTag(workspaceId: string, analysisId: string) {
  return `workspace:${workspaceId}:analysis:${analysisId}`;
}
