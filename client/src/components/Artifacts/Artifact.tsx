import React, { useEffect, useCallback, useRef, useState } from 'react';
import throttle from 'lodash/throttle';
import { visit } from 'unist-util-visit';
import { useSetRecoilState, useRecoilCallback } from 'recoil';
import { useLocation } from 'react-router-dom';
import type { Pluggable } from 'unified';
import type { Artifact } from '~/common';
import { useMessageContext } from '~/Providers/MessageContext';
import { useArtifactContext } from '~/Providers/ArtifactContext';
import { logger, extractContent, isArtifactRoute } from '~/utils';
import { artifactsState, currentArtifactId, artifactsVisibility } from '~/store/artifacts';
import families from '~/store/families';
import ArtifactButton from './ArtifactButton';

export const artifactPlugin: Pluggable = () => {
  return (tree) => {
    visit(tree, ['textDirective', 'leafDirective', 'containerDirective'], (node, index, parent) => {
      if (node.type === 'textDirective') {
        const replacementText = `:${node.name}`;
        if (parent && Array.isArray(parent.children) && typeof index === 'number') {
          parent.children[index] = {
            type: 'text',
            value: replacementText,
          };
        }
      }
      if (node.name !== 'artifact') {
        return;
      }
      node.data = {
        hName: node.name,
        hProperties: node.attributes,
        ...node.data,
      };
      return node;
    });
  };
};

const defaultTitle = 'untitled';
const defaultType = 'unknown';
const defaultIdentifier = 'lc-no-identifier';

export function Artifact({
  node: _node,
  ...props
}: Artifact & {
  children: React.ReactNode | { props: { children: React.ReactNode } };
  node: unknown;
}) {
  const location = useLocation();
  const { messageId } = useMessageContext();
  const { getNextIndex, resetCounter } = useArtifactContext();
  const artifactIndex = useRef(getNextIndex(false)).current;

  const setArtifacts = useSetRecoilState(artifactsState);
  const setCurrentArtifactId = useSetRecoilState(currentArtifactId);
  const setArtifactsVisible = useSetRecoilState(artifactsVisibility);
  const [artifact, setArtifact] = useState<Artifact | null>(null);

  /**
   * Captured at first render via a non-subscribing snapshot read so this
   * component doesn't re-render every time `isSubmittingFamily(0)` flips.
   * Mirrors `ToolArtifactCard`'s pattern: a `:::artifact` directive that
   * closes while the response is still streaming is a fresh arrival and
   * should steal panel focus; one encountered on history load/navigation
   * (isSubmitting already false) must not auto-open the panel.
   */
  const readInitialIsSubmitting = useRecoilCallback(
    ({ snapshot }) =>
      () =>
        snapshot.getLoadable(families.isSubmittingFamily(0)).valueMaybe() ?? false,
    [],
  );
  const mountedDuringStreamRef = useRef<boolean | null>(null);
  if (mountedDuringStreamRef.current === null) {
    mountedDuringStreamRef.current = readInitialIsSubmitting();
  }

  const throttledUpdateRef = useRef(
    throttle((updateFn: () => void) => {
      updateFn();
    }, 25),
  );

  const updateArtifact = useCallback(() => {
    const content = extractContent(props.children);
    logger.log('artifacts', 'updateArtifact: content.length', content.length);

    const title = props.title ?? defaultTitle;
    const type = props.type ?? defaultType;
    const identifier = props.identifier ?? defaultIdentifier;
    const artifactKey = `${identifier}_${type}_${title}_${messageId}`
      .replace(/\s+/g, '_')
      .toLowerCase();

    throttledUpdateRef.current(() => {
      const now = Date.now();
      if (artifactKey === `${defaultIdentifier}_${defaultType}_${defaultTitle}_${messageId}`) {
        return;
      }

      const currentArtifact: Artifact = {
        id: artifactKey,
        identifier,
        title,
        type,
        content,
        messageId,
        index: artifactIndex,
        lastUpdateTime: now,
      };

      if (!isArtifactRoute(location.pathname)) {
        return setArtifact(currentArtifact);
      }

      setArtifacts((prevArtifacts) => {
        if (
          prevArtifacts?.[artifactKey] != null &&
          prevArtifacts[artifactKey]?.content === content
        ) {
          return prevArtifacts;
        }

        return {
          ...prevArtifacts,
          [artifactKey]: currentArtifact,
        };
      });

      setArtifact(currentArtifact);
    });
  }, [
    props.type,
    props.title,
    setArtifacts,
    props.children,
    props.identifier,
    messageId,
    artifactIndex,
    location.pathname,
  ]);

  useEffect(() => {
    resetCounter();
    updateArtifact();
  }, [updateArtifact, resetCounter]);

  /**
   * Self-bootstrap the side panel for a freshly streamed directive.
   * `useArtifacts` (the hook that owns auto-open/auto-focus) only runs
   * once `<Artifacts />` is mounted, and `Presentation` only mounts it
   * once `currentArtifactId != null` — a circular gate that leaves the
   * very first `:::artifact` of a session with no path to ever open the
   * panel. Mirroring `ToolArtifactCard`'s mount effect breaks the cycle:
   * a directive that closes mid-stream claims focus and forces
   * visibility, exactly like a code-execution artifact arriving via SSE.
   * Unlike the tool-artifact pipeline, every directive type (code
   * included) auto-opens here — the model creates a `:::artifact` block
   * specifically to be shown in the panel, so there's no "helper script"
   * carve-out. History mounts (isSubmitting already false when this
   * component first rendered) never steal focus.
   */
  useEffect(() => {
    if (artifact?.id == null) {
      return;
    }
    if (!mountedDuringStreamRef.current) {
      return;
    }
    // Only auto-open for artifacts actually written to global `artifactsState`
    // — `updateArtifact` skips that write off the artifact routes, in which
    // case there's nothing in the panel's data source to focus.
    if (!isArtifactRoute(location.pathname)) {
      return;
    }
    setCurrentArtifactId(artifact.id);
    setArtifactsVisible(true);
  }, [artifact?.id, location.pathname, setCurrentArtifactId, setArtifactsVisible]);

  return <ArtifactButton artifact={artifact} />;
}
