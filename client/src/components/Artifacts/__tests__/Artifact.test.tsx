import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { RecoilRoot, useRecoilValue } from 'recoil';
import { render } from '@testing-library/react';
import type { MutableSnapshot } from 'recoil';
import type { Artifact as ArtifactType } from '~/common';
import { Artifact } from '../Artifact';
import { MessageContext } from '~/Providers/MessageContext';
import { ArtifactContext } from '~/Providers/ArtifactContext';
import store from '~/store';

jest.mock('~/utils', () => ({
  cn: (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(' '),
  logger: { log: jest.fn(), warn: jest.fn(), error: jest.fn() },
  extractContent: (children: React.ReactNode | { props: { children: React.ReactNode } }) => {
    if (children != null && typeof children === 'object' && 'props' in children) {
      return String((children as { props: { children: React.ReactNode } }).props.children ?? '');
    }
    return String(children ?? '');
  },
  isArtifactRoute: (pathname: string) =>
    pathname.startsWith('/c/') || pathname.startsWith('/share/'),
}));

jest.mock('../ArtifactButton', () => ({
  __esModule: true,
  default: () => <div data-testid="artifact-button" />,
}));

interface ArtifactsSnapshot {
  visibility: boolean;
  currentArtifactId: string | null;
  artifactIds: string[];
}

const StateProbe = ({ onSnapshot }: { onSnapshot: (snap: ArtifactsSnapshot) => void }) => {
  const visibility = useRecoilValue(store.artifactsVisibility);
  const currentArtifactId = useRecoilValue(store.currentArtifactId);
  const artifacts = useRecoilValue(store.artifactsState);
  React.useEffect(() => {
    onSnapshot({
      visibility,
      currentArtifactId,
      artifactIds: Object.keys(artifacts ?? {}),
    });
  });
  return null;
};

const artifactContextValue = {
  getNextIndex: () => 0,
  resetCounter: () => {},
};

const renderArtifact = (
  props: { identifier: string; type: string; title: string; children: React.ReactNode },
  opts: { streaming?: boolean; pathname?: string; visibility?: boolean } = {},
) => {
  const streaming = opts.streaming ?? true;
  const pathname = opts.pathname ?? '/c/test-convo';
  const initializeState = (snap: MutableSnapshot) => {
    snap.set(store.isSubmittingFamily(0), streaming);
    if (opts.visibility != null) {
      snap.set(store.artifactsVisibility, opts.visibility);
    }
  };
  let snapshot: ArtifactsSnapshot = { visibility: false, currentArtifactId: null, artifactIds: [] };
  const utils = render(
    <RecoilRoot initializeState={initializeState}>
      <MemoryRouter initialEntries={[pathname]}>
        <MessageContext.Provider
          value={{ messageId: 'msg-1', isExpanded: true, conversationId: 'test-convo' }}
        >
          <ArtifactContext.Provider value={artifactContextValue}>
            <StateProbe
              onSnapshot={(snap) => {
                snapshot = snap;
              }}
            />
            {/* react-markdown invokes this component with only the directive's
             * attributes (identifier/type/title/children) at runtime; the
             * shared `Artifact` interface's `id`/`lastUpdateTime` fields
             * don't apply to that call site, so the cast mirrors production. */}
            <Artifact
              node={undefined}
              {...(props as unknown as ArtifactType & { children: React.ReactNode })}
            />
          </ArtifactContext.Provider>
        </MessageContext.Provider>
      </MemoryRouter>
    </RecoilRoot>,
  );
  return { ...utils, getSnapshot: () => snapshot };
};

describe('Artifact directive auto-open', () => {
  it('auto-focuses and reveals the panel when a directive closes mid-stream', () => {
    const { getSnapshot } = renderArtifact(
      { identifier: 'demo', type: 'text/html', title: 'Demo', children: '<h1>hi</h1>' },
      { streaming: true, visibility: false },
    );
    const snap = getSnapshot();
    expect(snap.artifactIds.length).toBe(1);
    expect(snap.currentArtifactId).toBe(snap.artifactIds[0]);
    expect(snap.visibility).toBe(true);
  });

  it('does not auto-open when the directive mounts outside an active stream (history load)', () => {
    const { getSnapshot } = renderArtifact(
      { identifier: 'demo', type: 'text/html', title: 'Demo', children: '<h1>hi</h1>' },
      { streaming: false },
    );
    const snap = getSnapshot();
    expect(snap.artifactIds.length).toBe(1);
    expect(snap.currentArtifactId).toBeNull();
  });

  it('auto-opens a streaming code-type directive too (no click-to-open carve-out)', () => {
    // Unlike the tool-artifact pipeline, `:::artifact` directives are
    // deliberately authored by the model to be shown in the panel —
    // there's no "helper script" bucket to exclude here.
    const { getSnapshot } = renderArtifact(
      {
        identifier: 'script',
        type: 'application/vnd.ant.python',
        title: 'script.py',
        children: 'print(1)',
      },
      { streaming: true },
    );
    const snap = getSnapshot();
    expect(snap.artifactIds.length).toBe(1);
    expect(snap.currentArtifactId).toBe(snap.artifactIds[0]);
  });

  it('does not register or auto-open when off an artifact route', () => {
    const { getSnapshot } = renderArtifact(
      { identifier: 'demo', type: 'text/html', title: 'Demo', children: '<h1>hi</h1>' },
      { streaming: true, pathname: '/' },
    );
    const snap = getSnapshot();
    expect(snap.artifactIds.length).toBe(0);
    expect(snap.currentArtifactId).toBeNull();
  });
});
