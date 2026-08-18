/* Artifact Library */
import { useInfiniteQuery } from '@tanstack/react-query';
import { QueryKeys, dataService } from 'librechat-data-provider';
import type { UseInfiniteQueryOptions } from '@tanstack/react-query';
import type { ArtifactLibraryResponse, ArtifactLibraryParams } from 'librechat-data-provider';

export const useArtifactLibraryQuery = (
  params?: ArtifactLibraryParams,
  config?: UseInfiniteQueryOptions<ArtifactLibraryResponse>,
) => {
  return useInfiniteQuery<ArtifactLibraryResponse>(
    [QueryKeys.artifactLibrary, params?.limit ?? 25],
    ({ pageParam }) =>
      dataService.getArtifactLibrary({
        limit: params?.limit,
        cursor: typeof pageParam === 'string' && pageParam.length > 0 ? pageParam : undefined,
      }),
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchOnMount: false,
      ...config,
    },
  );
};
