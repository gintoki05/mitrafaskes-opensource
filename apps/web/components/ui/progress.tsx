import * as React from 'react';
import { Progress as ProgressPrimitive } from '@base-ui/react/progress';

import { cn } from '@/lib/utils';

function Progress({
  className,
  ...props
}: React.ComponentProps<typeof ProgressPrimitive.Root>) {
  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      className={cn(
        'relative h-2 w-full overflow-hidden rounded-full bg-primary/15',
        className,
      )}
      {...props}
    >
      <ProgressPrimitive.Track
        data-slot="progress-track"
        className="h-full w-full"
      >
        <ProgressPrimitive.Indicator
          data-slot="progress-indicator"
          className="h-full w-full bg-primary transition-[width] duration-300 data-[indeterminate]:w-1/3 data-[indeterminate]:animate-pulse"
        />
      </ProgressPrimitive.Track>
    </ProgressPrimitive.Root>
  );
}

export { Progress };
