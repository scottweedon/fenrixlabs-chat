import { useCallback } from 'react';
import { useSetRecoilState } from 'recoil';
import type { Artifact } from '~/common';
import { artifactsState, currentArtifactId, artifactsVisibility } from '~/store/artifacts';

export interface ArtifactFileUpdateEvent {
  relativePath: string;
  identifier: string;
  title: string;
  mimeType: string;
  content: string;
  conversationId: string;
  messageId?: string;
}

/**
 * Renders an artifact-filesystem write/patch's fresh content in the panel the
 * moment the tool call succeeds, instead of waiting for the model to finish
 * its turn and paste a `:::artifact{...}` directive. Keyed by `relativePath`
 * (stable across every patch in a build) in its own `live_` namespace so it
 * can never collide with a directive-parsed entry's key — once the model's
 * final reply pastes the real directive, that registers as a second entry;
 * this live one simply stops updating and is superseded in the panel's
 * ordering (both remain individually selectable in the artifact picker).
 */
export default function useArtifactFileUpdateHandler() {
  const setArtifacts = useSetRecoilState(artifactsState);
  const setCurrentArtifactId = useSetRecoilState(currentArtifactId);
  const setArtifactsVisible = useSetRecoilState(artifactsVisibility);

  return useCallback(
    (event: ArtifactFileUpdateEvent) => {
      const key = `live_${event.relativePath}`;
      const now = Date.now();

      setArtifacts((prevArtifacts) => {
        const isNew = prevArtifacts?.[key] == null;
        const nextArtifact: Artifact = {
          id: key,
          identifier: event.identifier,
          title: event.title,
          type: event.mimeType,
          content: event.content,
          messageId: event.messageId,
          lastUpdateTime: now,
        };

        if (isNew) {
          setCurrentArtifactId((prev) => prev ?? key);
          setArtifactsVisible(true);
        }

        return {
          ...prevArtifacts,
          [key]: nextArtifact,
        };
      });
    },
    [setArtifacts, setCurrentArtifactId, setArtifactsVisible],
  );
}
