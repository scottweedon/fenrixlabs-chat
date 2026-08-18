import { Schema } from 'mongoose';
import type { IArtifactFile } from '~/types/artifactFile';
import { ARTIFACT_FILE_MODES } from '~/types/artifactFile';

const artifactFileSchema: Schema<IArtifactFile> = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    conversationId: {
      type: String,
      required: true,
      index: true,
    },
    messageId: {
      type: String,
    },
    identifier: {
      type: String,
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    relativePath: {
      type: String,
      required: true,
    },
    mode: {
      type: String,
      required: true,
      enum: ARTIFACT_FILE_MODES,
    },
  },
  { timestamps: true },
);

/**
 * One doc per (user, relativePath): a later write/patch to the same file
 * upserts onto this key rather than creating a duplicate Library row.
 */
artifactFileSchema.index({ user: 1, relativePath: 1 }, { unique: true });

/** Powers the Library page's default listing: newest-created-first per user, `_id`-cursor paginated. */
artifactFileSchema.index({ user: 1, _id: -1 });

export default artifactFileSchema;
