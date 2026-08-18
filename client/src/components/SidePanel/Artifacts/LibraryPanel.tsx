import { useMemo } from 'react';
import { FileText, Globe } from 'lucide-react';
import { Spinner, Button } from '@librechat/client';
import type { TArtifactLibraryEntry } from 'librechat-data-provider';
import { useArtifactLibraryQuery } from '~/data-provider';
import { useLocalize } from '~/hooks';
import { formatDate } from '~/utils';

function ModeIcon({ mode }: { mode: TArtifactLibraryEntry['mode'] }) {
  const Icon = mode === 'webpage' ? Globe : FileText;
  return <Icon className="h-4 w-4 flex-shrink-0 text-text-secondary" aria-hidden="true" />;
}

function LibraryRow({ entry }: { entry: TArtifactLibraryEntry }) {
  return (
    <a
      href={`/c/${entry.conversationId}`}
      className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm hover:bg-surface-hover"
    >
      <ModeIcon mode={entry.mode} />
      <span className="min-w-0 flex-1 truncate text-text-primary">{entry.title}</span>
      <span className="flex-shrink-0 text-xs text-text-secondary">
        {formatDate(entry.updatedAt)}
      </span>
    </a>
  );
}

export default function LibraryPanel() {
  const localize = useLocalize();
  const { data, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage } =
    useArtifactLibraryQuery();

  const entries = useMemo(
    () => data?.pages.flatMap((page) => page.artifacts) ?? [],
    [data],
  );

  if (isLoading) {
    return (
      <div className="flex h-24 w-full items-center justify-center">
        <Spinner className="h-5 w-5" />
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="px-3 py-4 text-sm text-text-secondary">
        {localize('com_ui_artifact_library_empty')}
      </div>
    );
  }

  return (
    <div className="flex h-auto w-full flex-col gap-0.5 px-2 pb-3 pt-2">
      {entries.map((entry) => (
        <LibraryRow key={entry._id} entry={entry} />
      ))}
      {hasNextPage && (
        <Button
          variant="ghost"
          size="sm"
          className="mt-1 w-full"
          disabled={isFetchingNextPage}
          onClick={() => fetchNextPage()}
        >
          {isFetchingNextPage ? <Spinner className="h-4 w-4" /> : localize('com_ui_load_more')}
        </Button>
      )}
    </div>
  );
}
