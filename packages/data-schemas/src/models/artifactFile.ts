import { Model } from 'mongoose';
import type { IArtifactFile } from '~/types/artifactFile';
import { applyTenantIsolation } from '~/models/plugins/tenantIsolation';
import artifactFileSchema from '~/schema/artifactFile';

export function createArtifactFileModel(mongoose: typeof import('mongoose')): Model<IArtifactFile> {
  applyTenantIsolation(artifactFileSchema);
  return (
    mongoose.models.ArtifactFile || mongoose.model<IArtifactFile>('ArtifactFile', artifactFileSchema)
  );
}
