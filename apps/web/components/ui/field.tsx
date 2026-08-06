import * as React from "react";

import { cn } from "@/lib/utils";

function Field({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="field" className={cn("grid gap-2", className)} {...props} />;
}

type FieldLabelProps = React.ComponentProps<"label"> & {
  required?: boolean | string;
};

function FieldLabel({
  className,
  required,
  children,
  ...props
}: FieldLabelProps) {
  const requiredText = typeof required === "string" ? required : null;

  return (
    <label
      data-slot="field-label"
      className={cn("text-xs font-semibold text-foreground", className)}
      {...props}
    >
      {children}
      {required === true ? (
        <>
          <span
            className="ml-1 text-destructive"
            aria-hidden="true"
            title="Wajib diisi"
          >
            *
          </span>
          <span className="sr-only">Wajib diisi</span>
        </>
      ) : requiredText ? (
        <>
          {" "}
          <span
            className={cn(
              "font-mono text-[10px] font-bold",
              requiredText === "Wajib" ? "text-primary" : "text-muted-foreground",
            )}
          >
            {requiredText}
          </span>
        </>
      ) : null}
    </label>
  );
}

function FieldDescription({
  className,
  ...props
}: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="field-description"
      className={cn("text-xs leading-relaxed text-muted-foreground", className)}
      {...props}
    />
  );
}

type FieldErrorProps = React.ComponentProps<"p"> & {
  errors?: Array<{ message?: string } | undefined>;
};

function FieldError({ errors, children, className, ...props }: FieldErrorProps) {
  const messages = errors
    ?.map((error) => error?.message)
    .filter((message): message is string => Boolean(message));
  const message = messages?.join(", ");

  if (!message && !children) return null;

  return (
    <p
      role="alert"
      data-slot="field-error"
      className={cn("text-xs font-medium text-destructive", className)}
      {...props}
    >
      {message || children}
    </p>
  );
}

export { Field, FieldDescription, FieldError, FieldLabel };
