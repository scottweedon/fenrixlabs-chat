import type * as t from '~/types';

export const DEFAULT_ARTIFACT_LIBRARY_LIMIT = 25;
export const MAX_ARTIFACT_LIBRARY_LIMIT = 100;

export function createArtifactFileMethods(mongoose: typeof import('mongoose')): {
  upsertArtifactFile: (params: t.UpsertArtifactFileParams) => Promise<void>;
  listArtifactLibrary: (
    params: t.ListArtifactLibraryParams,
  ) => Promise<t.ListArtifactLibraryResult>;
} {
  /**
   * Idempotent per (user, relativePath): a later patch to the same file
   * updates title/mode/timestamps on the existing Library row instead of
   * creating a duplicate — matches the unique index on the schema.
   */
  async function upsertArtifactFile({
    userId,
    conversationId,
    messageId,
    identifier,
    title,
    relativePath,
    mode,
  }: t.UpsertArtifactFileParams): Promise<void> {
    const ArtifactFile = mongoose.models.ArtifactFile;
    await ArtifactFile.updateOne(
      { user: userId, relativePath },
      { $set: { conversationId, messageId, identifier, title, mode } },
      { upsert: true, runValidators: true },
    );
  }

  /** Newest-first, cursor-paginated on `_id` (stable under concurrent writes). */
  async function listArtifactLibrary({
    userId,
    cursor,
    limit = DEFAULT_ARTIFACT_LIBRARY_LIMIT,
  }: t.ListArtifactLibraryParams): Promise<t.ListArtifactLibraryResult> {
    const ArtifactFile = mongoose.models.ArtifactFile;
    const boundedLimit = Math.min(Math.max(1, limit), MAX_ARTIFACT_LIBRARY_LIMIT);
    const filter: Record<string, unknown> = { user: userId };
    if (cursor) {
      filter._id = { $lt: cursor };
    }

    const artifacts = await ArtifactFile.find(filter)
      .sort({ _id: -1 })
      .limit(boundedLimit + 1)
      .lean<t.IArtifactFileLean[]>();

    const hasMore = artifacts.length > boundedLimit;
    const page = hasMore ? artifacts.slice(0, boundedLimit) : artifacts;
    const nextCursor = hasMore ? String(page[page.length - 1]._id) : null;

    return { artifacts: page, nextCursor };
  }

  return {
    upsertArtifactFile,
    listArtifactLibrary,
  };
}

export type ArtifactFileMethods = ReturnType<typeof createArtifactFileMethods>;
