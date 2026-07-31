import { ReactNode } from 'react';

export function PageHeader({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <header className="clinical-panel flex min-w-0 flex-col justify-between gap-4 p-4 sm:p-6 md:flex-row md:items-center">
      <div className="min-w-0">
        <h1 className="flex items-start gap-2 text-xl font-bold leading-tight text-foreground">
          <span className="mt-0.5 shrink-0 text-primary" aria-hidden="true">
            {icon}
          </span>
          <span>{title}</span>
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      </div>
      {action ? <div className="flex shrink-0 flex-wrap items-center gap-2">{action}</div> : null}
    </header>
  );
}
