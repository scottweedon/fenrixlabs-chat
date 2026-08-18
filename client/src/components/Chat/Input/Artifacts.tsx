import React, { memo, useState, useCallback, useMemo, useEffect } from 'react';
import * as Ariakit from '@ariakit/react';
import { useSetRecoilState } from 'recoil';
import { CheckboxButton } from '@librechat/client';
import { WandSparkles, ChevronDown } from 'lucide-react';
import { Constants, ArtifactModes, defaultAgentCapabilities } from 'librechat-data-provider';
import { useLocalize, useAgentCapabilities } from '~/hooks';
import { useBadgeRowContext } from '~/Providers';
import { cn } from '~/utils';
import store from '~/store';

interface ArtifactsToggleState {
  enabled: boolean;
  mode: string;
}

function Artifacts() {
  const localize = useLocalize();
  const context = useBadgeRowContext();
  const { toggleState, debouncedChange, isPinned } = context?.artifacts ?? {};

  const { artifactsEnabled } = useAgentCapabilities(
    context?.agentsConfig?.capabilities ?? defaultAgentCapabilities,
  );

  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [isButtonExpanded, setIsButtonExpanded] = useState(false);

  const currentState = useMemo<ArtifactsToggleState>(() => {
    if (typeof toggleState === 'string' && toggleState) {
      return { enabled: true, mode: toggleState };
    }
    return { enabled: false, mode: '' };
  }, [toggleState]);

  const isEnabled = currentState.enabled;
  const isWebpageEnabled = currentState.mode === ArtifactModes.WEBPAGE;
  const isDocumentEnabled = currentState.mode === ArtifactModes.DOCUMENT;

  const conversationKey = context?.conversationId ?? Constants.NEW_CONVO;
  const setPanelPinned = useSetRecoilState(store.artifactsPanelPinned(conversationKey));

  /**
   * Keep the "always show the artifacts panel" pin in sync with the
   * enabled state, regardless of whether it changed via this button's
   * click handler or was hydrated from the conversation's saved config.
   */
  useEffect(() => {
    setPanelPinned(isEnabled);
  }, [isEnabled, setPanelPinned]);

  const handleToggle = useCallback(() => {
    if (!debouncedChange) return;
    if (isEnabled) {
      debouncedChange({ value: '' });
      setIsButtonExpanded(false);
    } else {
      debouncedChange({ value: ArtifactModes.WEBPAGE });
    }
  }, [isEnabled, debouncedChange]);

  const handleMenuButtonClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setIsButtonExpanded(!isButtonExpanded);
    },
    [isButtonExpanded],
  );

  useEffect(() => {
    if (!isPopoverOpen) {
      setIsButtonExpanded(false);
    }
  }, [isPopoverOpen]);

  const handleWebpageSelect = useCallback(() => {
    debouncedChange?.({ value: ArtifactModes.WEBPAGE });
  }, [debouncedChange]);

  const handleDocumentSelect = useCallback(() => {
    debouncedChange?.({ value: ArtifactModes.DOCUMENT });
  }, [debouncedChange]);

  if (!artifactsEnabled) {
    return null;
  }

  if (!isEnabled && !isPinned) {
    return null;
  }

  return (
    <div className="flex">
      <CheckboxButton
        className={cn('max-w-fit', isEnabled && 'rounded-r-none border-r-0')}
        checked={isEnabled}
        setValue={handleToggle}
        label={localize('com_ui_artifacts')}
        isCheckedClassName="border-amber-600/40 bg-amber-500/10 hover:bg-amber-700/10"
        icon={<WandSparkles className="icon-md" aria-hidden="true" />}
      />

      {isEnabled && (
        <Ariakit.MenuProvider open={isPopoverOpen} setOpen={setIsPopoverOpen}>
          <Ariakit.MenuButton
            className={cn(
              'w-7 rounded-l-none rounded-r-full border-b border-l-0 border-r border-t border-border-light md:w-6',
              'border-amber-600/40 bg-amber-500/10 hover:bg-amber-700/10',
              'transition-colors',
            )}
            onClick={handleMenuButtonClick}
          >
            <ChevronDown
              className={cn(
                'ml-1 h-4 w-4 text-text-secondary transition-transform duration-300 md:ml-0.5',
                isButtonExpanded && 'rotate-180',
              )}
              aria-hidden="true"
            />
          </Ariakit.MenuButton>

          <Ariakit.Menu
            gutter={4}
            className={cn(
              'animate-popover-top-left z-40 flex min-w-[250px] flex-col rounded-xl',
              'border border-border-light bg-surface-secondary shadow-lg',
            )}
            portal={true}
            unmountOnHide={true}
          >
            <div className="px-2 py-1.5">
              <div className="mb-2 text-xs font-medium text-text-secondary">
                {localize('com_ui_artifacts_options')}
              </div>

              {/* Webpage Option */}
              <Ariakit.MenuItem
                hideOnClick={false}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  handleWebpageSelect();
                }}
                className={cn(
                  'mb-1 flex items-center justify-between gap-2 rounded-lg px-2 py-2',
                  'cursor-pointer bg-surface-secondary text-text-primary outline-none transition-colors',
                  'hover:bg-surface-hover data-[active-item]:bg-surface-hover',
                  isWebpageEnabled && 'bg-surface-active',
                )}
              >
                <span className="text-sm">{localize('com_ui_artifacts_mode_webpage' as any)}</span>
                <div className="ml-auto flex items-center">
                  <Ariakit.MenuItemCheck checked={isWebpageEnabled} />
                </div>
              </Ariakit.MenuItem>

              {/* Document Option */}
              <Ariakit.MenuItem
                hideOnClick={false}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  handleDocumentSelect();
                }}
                className={cn(
                  'mb-1 flex items-center justify-between gap-2 rounded-lg px-2 py-2',
                  'cursor-pointer bg-surface-secondary text-text-primary outline-none transition-colors',
                  'hover:bg-surface-hover data-[active-item]:bg-surface-hover',
                  isDocumentEnabled && 'bg-surface-active',
                )}
              >
                <span className="text-sm">{localize('com_ui_artifacts_mode_document' as any)}</span>
                <div className="ml-auto flex items-center">
                  <Ariakit.MenuItemCheck checked={isDocumentEnabled} />
                </div>
              </Ariakit.MenuItem>
            </div>
          </Ariakit.Menu>
        </Ariakit.MenuProvider>
      )}
    </div>
  );
}

export default memo(Artifacts);
