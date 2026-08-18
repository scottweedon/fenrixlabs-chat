import { memo } from 'react';
import type { Artifact, LocalizeFunction } from '~/common';
import { getFileType } from '~/utils';
import FilePreview from '~/components/Chat/Input/Files/FilePreview';
import { useLocalize } from '~/hooks';
import { cn } from '~/utils';

/** Shared by the desktop sidebar and the mobile popover so both list rows the same way. */
export function getArtifactLabel(artifact: Artifact | undefined, localize: LocalizeFunction): string {
  return artifact?.title || localize('com_ui_untitled_artifact' as any);
}

interface ArtifactExplorerProps {
  orderedArtifactIds: string[];
  artifacts: Record<string, Artifact | undefined> | null;
  currentArtifactId: string | null;
  onSelect: (id: string) => void;
  className?: string;
}

/**
 * Lists every distinct artifact created in the conversation (not files within one artifact
 * bundle — that's `ArtifactTabs`'s separate `workspaceFiles` selector) so the user can switch
 * between them. Replaces `ArtifactVersion`'s hidden "Version 1/2/3" dropdown with a persistent,
 * always-visible list showing each artifact's real title.
 */
function ArtifactExplorer({
  orderedArtifactIds,
  artifacts,
  currentArtifactId,
  onSelect,
  className,
}: ArtifactExplorerProps) {
  const localize = useLocalize();
  const fileType = getFileType('artifact');

  return (
    <nav
      aria-label={localize('com_ui_artifacts')}
      className={cn('flex h-full flex-col gap-0.5 overflow-y-auto p-2', className)}
    >
      {orderedArtifactIds.map((id) => {
        const artifact = artifacts?.[id];
        const isSelected = id === currentArtifactId;

        return (
          <button
            key={id}
            type="button"
            onClick={() => onSelect(id)}
            aria-current={isSelected ? 'true' : undefined}
            className={cn(
              'flex items-center gap-2 rounded-lg px-2 py-2 text-left text-sm transition-colors',
              'outline-none focus-visible:ring-2 focus-visible:ring-border-xheavy',
              isSelected
                ? 'bg-surface-active text-text-primary'
                : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary',
            )}
          >
            <FilePreview fileType={fileType} className="relative size-4 flex-shrink-0" />
            <span className="truncate">{getArtifactLabel(artifact, localize)}</span>
          </button>
        );
      })}
    </nav>
  );
}

export default memo(ArtifactExplorer);
