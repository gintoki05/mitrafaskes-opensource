import { Check, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type FormStep = {
  label: string;
  description: string;
};

type FormStepIndicatorProps = {
  steps: FormStep[];
  currentStep: number;
};

function FormStepIndicator({ steps, currentStep }: FormStepIndicatorProps) {
  return (
    <nav aria-label="Kemajuan pengisian formulir">
      <ol className="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-3">
        {steps.map((step, index) => {
          const isCurrent = index === currentStep;
          const isComplete = index < currentStep;

          return (
            <li
              key={step.label}
              className="flex min-w-0 flex-1 items-start gap-2"
              aria-current={isCurrent ? "step" : undefined}
            >
              <div className="flex min-w-0 flex-1 items-start gap-2">
                <span
                  className={cn(
                    "flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors",
                    isCurrent || isComplete
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  {isComplete ? (
                    <Check className="size-3.5" aria-hidden="true" />
                  ) : (
                    index + 1
                  )}
                </span>
                <span className="min-w-0 pt-0.5">
                  <span
                    className={cn(
                      "block text-xs font-semibold leading-tight",
                      isCurrent ? "text-foreground" : "text-muted-foreground",
                    )}
                  >
                    {step.label}
                  </span>
                  <span className="mt-0.5 hidden text-[11px] leading-relaxed text-muted-foreground sm:block">
                    {step.description}
                  </span>
                </span>
              </div>
              {index < steps.length - 1 ? (
                <span
                  aria-hidden="true"
                  className={cn(
                    "mt-3 hidden h-px min-w-3 flex-1 sm:block",
                    index < currentStep ? "bg-primary/50" : "bg-border",
                  )}
                />
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

type MasterFaskesFormShellProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  steps: FormStep[];
  currentStep: number;
  children: ReactNode;
  footer: ReactNode;
  className?: string;
};

export function MasterFaskesFormShell({
  icon: Icon,
  title,
  description,
  steps,
  currentStep,
  children,
  footer,
  className,
}: MasterFaskesFormShellProps) {
  const activeStep = steps[currentStep];

  return (
    <Card className={cn("shadow-none", className)}>
      <CardHeader className="gap-4 border-b border-border pb-5">
        <div className="flex items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-card)] bg-primary/10 text-primary">
            <Icon className="size-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <CardTitle className="text-base font-bold text-foreground">
              {title}
            </CardTitle>
            <p className="mt-1 max-w-2xl text-xs leading-relaxed text-muted-foreground">
              {description}
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <FormStepIndicator steps={steps} currentStep={currentStep} />
          <p className="text-[11px] text-muted-foreground">
            Langkah {currentStep + 1} dari {steps.length} · {activeStep.description}
          </p>
        </div>
      </CardHeader>
      <CardContent className="space-y-6 pt-5">{children}</CardContent>
      <CardFooter className="border-border bg-card px-5 py-4">
        {footer}
      </CardFooter>
    </Card>
  );
}

type FormSectionProps = {
  title: string;
  description: string;
  children: ReactNode;
  className?: string;
};

export function FormSection({
  title,
  description,
  children,
  className,
}: FormSectionProps) {
  return (
    <section className={cn("space-y-4", className)}>
      <div className="border-b border-border pb-3">
        <h2 className="text-sm font-bold text-foreground">{title}</h2>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          {description}
        </p>
      </div>
      {children}
    </section>
  );
}

type FormActionsProps = {
  currentStep: number;
  stepCount: number;
  onCancel?: () => void;
  onBack: () => void;
  onNext: () => void;
  isSubmitting: boolean;
  disabled?: boolean;
  submitLabel: string;
  submittingLabel: string;
};

export function FormActions({
  currentStep,
  stepCount,
  onCancel,
  onBack,
  onNext,
  isSubmitting,
  disabled = false,
  submitLabel,
  submittingLabel,
}: FormActionsProps) {
  const isLastStep = currentStep === stepCount - 1;

  return (
    <div className="flex w-full items-center justify-between gap-3">
      <div className="flex shrink-0 items-center">
        {onCancel ? (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
            className="text-xs font-semibold"
          >
            Batal
          </Button>
        ) : null}
      </div>
      <div className="flex min-w-0 flex-1 items-center justify-end gap-2 sm:flex-none">
        {currentStep > 0 ? (
          <Button
            type="button"
            variant="ghost"
            onClick={onBack}
            disabled={isSubmitting}
            className="shrink-0 text-xs font-semibold"
          >
            Kembali
          </Button>
        ) : null}
        <Button
          type={isLastStep ? "submit" : "button"}
          onClick={isLastStep ? undefined : onNext}
          disabled={disabled || isSubmitting}
          aria-busy={isSubmitting}
          className="min-w-0 flex-1 text-xs font-bold sm:min-w-36 sm:flex-none"
        >
          {isSubmitting ? submittingLabel : isLastStep ? submitLabel : "Lanjut"}
        </Button>
      </div>
    </div>
  );
}
