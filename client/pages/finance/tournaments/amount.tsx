import type { ReactElement } from 'react';
import { cn } from 'cn';

import { formatVnd } from '../format.js';

/** Signed amounts read as gains or losses; the sign and the word carry it, the color only repeats it. */
export function Amount({
  value,
  signed = false,
  className,
}: {
  readonly value: number;
  readonly signed?: boolean;
  readonly className?: string;
}): ReactElement {
  return (
    <span
      className={cn(
        'font-semibold tabular-nums',
        signed && value > 0 && 'text-(--status-success)',
        signed && value < 0 && 'text-destructive',
        className,
      )}
    >
      {signed && value > 0 ? '+' : ''}
      {formatVnd(value)}
    </span>
  );
}
