import type { Types, Document } from 'mongoose';

export const ARTIFACT_FILE_MODES = ['webpage', 'document'] as const;

export type ArtifactFileMode = (typeof ARTIFACT_FILE_MODES)[number];

export interface IArtifactFile extends Document {
  user: Types.ObjectId;
  conversationId: string;
  messageId?: string;
  identifier: string;
  title: string;
  relativePath: string;
  mode: ArtifactFileMode;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IArtifactFileLean {
  _id: Types.ObjectId;
  conversationId: string;
  messageId?: string;
  identifier: string;
  title: string;
  relativePath: string;
  mode: ArtifactFileMode;
  createdAt: Date;
  updatedAt: Date;
}

export interface UpsertArtifactFileParams {
  userId: string | Types.ObjectId;
  conversationId: string;
  messageId?: string;
  identifier: string;
  title: string;
  relativePath: string;
  mode: ArtifactFileMode;
}

export interface ListArtifactLibraryParams {
  userId: string | Types.ObjectId;
  cursor?: string;
  limit?: number;
}

export interface ListArtifactLibraryResult {
  artifacts: IArtifactFileLean[];
  nextCursor: string | null;
}
