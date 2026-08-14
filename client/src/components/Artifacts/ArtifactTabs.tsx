import { useRef, useEffect, useMemo, useState } from 'react';
import * as Tabs from '@radix-ui/react-tabs';
import type { SandpackPreviewRef } from '@codesandbox/sandpack-react/unstyled';
import type { editor } from 'monaco-editor';
import type { Artifact } from '~/common';
import { useGetSharedStartupConfig, useGetStartupConfig } from '~/data-provider';
import { useLocalize } from '~/hooks';
import useArtifactProps from '~/hooks/Artifacts/useArtifactProps';
import { ArtifactCodeEditor } from './ArtifactCodeEditor';
import { useCodeState } from '~/Providers/EditorContext';
import { ArtifactPreview } from './ArtifactPreview';
import { useShareContext } from '~/Providers';

export default function ArtifactTabs({
  artifact,
  previewRef,
  isSharedConvo,
}: {
  artifact: Artifact;
  previewRef: React.MutableRefObject<SandpackPreviewRef>;
  isSharedConvo?: boolean;
}) {
  const localize = useLocalize();
  const { currentCode, setCurrentCode } = useCodeState();
  const { shareId } = useShareContext();
  const shouldUseSharedConfig =
    isSharedConvo === true && typeof shareId === 'string' && shareId.length > 0;
  const { data: startupConfig } = useGetStartupConfig({ enabled: !shouldUseSharedConfig });
  const { data: sharedStartupConfig } = useGetSharedStartupConfig(shareId, {
    enabled: shouldUseSharedConfig,
  });
  const resolvedStartupConfig = shouldUseSharedConfig ? sharedStartupConfig : startupConfig;
  const monacoRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const lastIdRef = useRef<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<string | undefined>(artifact.activeFile);

  useEffect(() => {
    if (artifact.id !== lastIdRef.current) {
      setCurrentCode(undefined);
      setSelectedFile(artifact.activeFile);
    }
    lastIdRef.current = artifact.id;
  }, [setCurrentCode, artifact.id, artifact.activeFile]);

  const selectedArtifact = useMemo(
    () => ({
      ...artifact,
      ...(selectedFile ? { activeFile: selectedFile } : {}),
    }),
    [artifact, selectedFile],
  );
  const { files, fileKey, template, sharedProps } = useArtifactProps({ artifact: selectedArtifact });

  useEffect(() => {
    if (selectedFile && files[selectedFile] != null) {
      return;
    }
    if (fileKey) {
      setSelectedFile(fileKey);
    }
  }, [fileKey, files, selectedFile]);

  const editorArtifact = useMemo(() => {
    const meta = artifact.workspaceFiles?.find((file) => file.path === fileKey);
    return {
      ...artifact,
      title: meta?.title ?? fileKey,
      language: meta?.language ?? artifact.language,
      content: files[fileKey],
    };
  }, [artifact, fileKey, files]);

  const hasWorkspaceSelector = (artifact.workspaceFiles?.length ?? 0) > 1;

  return (
    <div className="flex h-full w-full flex-col">
      {hasWorkspaceSelector && (
        <div className="flex items-center gap-2 border-b border-border-light bg-surface-primary-alt px-3 py-2">
          <label className="text-xs font-medium text-text-secondary" htmlFor="artifact-file-select">
            {localize('com_ui_file')}
          </label>
          <select
            id="artifact-file-select"
            value={fileKey}
            onChange={(event) => {
              setCurrentCode(undefined);
              setSelectedFile(event.target.value);
            }}
            className="min-w-0 flex-1 rounded-md border border-border-medium bg-surface-primary px-2 py-1 text-sm text-text-primary outline-none focus:border-border-heavy"
          >
            {(artifact.workspaceFiles ?? []).map((file) => (
              <option key={file.path} value={file.path}>
                {file.title ?? file.path}
              </option>
            ))}
          </select>
        </div>
      )}
      <Tabs.Content
        value="code"
        id="artifacts-code"
        className="h-full w-full flex-grow overflow-auto"
        tabIndex={-1}
      >
        <ArtifactCodeEditor
          artifact={editorArtifact}
          monacoRef={monacoRef}
          readOnly={isSharedConvo}
          contentKey={fileKey}
        />
      </Tabs.Content>

      <Tabs.Content
        value="preview"
        className="h-full w-full flex-grow overflow-hidden"
        tabIndex={-1}
      >
        <ArtifactPreview
          files={files}
          fileKey={fileKey}
          template={template}
          previewRef={previewRef}
          sharedProps={sharedProps}
          currentCode={currentCode}
          startupConfig={resolvedStartupConfig}
        />
      </Tabs.Content>
    </div>
  );
}
