"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import {
  useForm,
  useWatch,
  type FieldPath,
} from "react-hook-form";
import { Building2 } from "lucide-react";
import type { OrganizationSummary } from "@mitrafaskes/shared";
import {
  FormActions,
  type FormStep,
  MasterFaskesFormShell,
} from "./FormLayout";
import { emptyOrganization } from "./constants";
import { OrganizationFormContactStep } from "./OrganizationFormContactStep";
import { OrganizationFormIdentityStep } from "./OrganizationFormIdentityStep";
import { organizationFormSchema } from "./schemas";
import type {
  FormMode,
  OrganizationForm as OrganizationFormValues,
  SubmitHandler,
  SubmittingKind,
} from "./types";

type OrganizationFormProps = {
  canWrite: boolean;
  organizations: OrganizationSummary[];
  submitting: SubmittingKind | null;
  onSubmit: SubmitHandler<OrganizationFormValues>;
  initialValues?: OrganizationFormValues;
  mode?: FormMode;
  excludeId?: string;
  onCancel?: () => void;
};

const organizationSteps: FormStep[] = [
  {
    label: "Identitas wajib",
    description: "Kode, nama, jenis, dan induk",
  },
  {
    label: "Kontak & status",
    description: "Alamat, kontak, dan status data",
  },
];

const organizationStepFields: FieldPath<OrganizationFormValues>[][] = [
  ["code", "name", "type", "parentId"],
  ["addressText", "phone", "email", "active"],
];

export function OrganizationForm({
  canWrite,
  organizations,
  submitting,
  onSubmit,
  initialValues,
  mode = "create",
  excludeId,
  onCancel,
}: OrganizationFormProps) {
  const {
    control,
    formState: { errors, isSubmitting },
    register,
    reset,
    handleSubmit,
    trigger,
  } = useForm<OrganizationFormValues>({
    resolver: zodResolver(organizationFormSchema),
    defaultValues: initialValues ?? emptyOrganization,
    mode: "onBlur",
  });
  const [currentStep, setCurrentStep] = useState(0);
  const organizationType = useWatch({ control, name: "type" });

  const submit = handleSubmit(async (values) => {
    if (currentStep !== organizationSteps.length - 1) return;

    if (await onSubmit(values)) {
      reset(emptyOrganization);
      setCurrentStep(0);
    }
  });

  const goToNextStep = async () => {
    const valid = await trigger(organizationStepFields[currentStep], {
      shouldFocus: true,
    });
    if (valid) {
      setCurrentStep((step) => Math.min(step + 1, organizationSteps.length - 1));
    }
  };

  const shell = (
    <MasterFaskesFormShell
      icon={Building2}
      title={mode === "edit" ? "Edit organisasi / faskes" : "Tambah organisasi / faskes"}
      description="Mulai dari identitas yang wajib, lalu lengkapi kontak dan status bila diperlukan."
      steps={organizationSteps}
      currentStep={currentStep}
      footer={
        canWrite ? (
          <FormActions
            currentStep={currentStep}
            stepCount={organizationSteps.length}
            onCancel={onCancel}
            onBack={() => setCurrentStep((step) => Math.max(step - 1, 0))}
            onNext={() => void goToNextStep()}
            isSubmitting={isSubmitting || submitting === "organization"}
            submitLabel={mode === "edit" ? "Simpan perubahan" : "Simpan organisasi"}
            submittingLabel="Menyimpan..."
          />
        ) : null
      }
    >
      {canWrite ? (
        currentStep === 0 ? (
          <OrganizationFormIdentityStep
            control={control}
            errors={errors}
            register={register}
            organizationType={organizationType}
            organizations={organizations}
            excludeId={excludeId}
          />
        ) : (
          <OrganizationFormContactStep
            control={control}
            errors={errors}
            register={register}
          />
        )
      ) : (
        <p className="rounded-[var(--radius-control)] border border-border bg-muted/40 p-4 text-xs leading-relaxed text-muted-foreground">
          Akun ini hanya dapat melihat master faskes.
        </p>
      )}
    </MasterFaskesFormShell>
  );

  return canWrite ? (
    <form className="block" onSubmit={submit} noValidate>
      {shell}
    </form>
  ) : (
    shell
  );
}
