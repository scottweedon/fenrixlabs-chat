import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useLocalize } from '~/hooks';
import { cn } from '~/utils';

/**
 * Once a message has finished streaming, its full step rail (reasoning +
 * tool calls) collapses to one line — "Used N tools · Show work" — rather
 * than staying expanded. Nothing is discarded: `children` is the same rail
 * content that rendered live, just deferred until the user asks to see it.
 */
export default function StepRailSummary({
  count,
  children,
}: {
  count: number;
  children: React.ReactNode;
}) {
  const localize = useLocalize();
  const [isExpanded, setIsExpanded] = useState(false);

  if (isExpanded) {
    return (
      <div className="my-3">
        <div className="relative border-l border-border-light py-1 pl-4">{children}</div>
        <button
          type="button"
          className="mt-1 text-xs font-medium text-text-secondary hover:text-text-primary"
          onClick={() => setIsExpanded(false)}
        >
          {localize('com_ui_hide_work')}
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      className={cn(
        'my-2 inline-flex items-center gap-1.5 text-sm font-medium',
        'text-text-secondary hover:text-text-primary',
      )}
      onClick={() => setIsExpanded(true)}
      aria-expanded={false}
    >
      <ChevronDown className="size-3.5" aria-hidden="true" />
      <span>
        {localize('com_ui_used_n_steps', { 0: String(count) })} · {localize('com_ui_show_work')}
      </span>
    </button>
  );
}
