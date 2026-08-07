"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm, useWatch, type FieldPath } from "react-hook-form";
import { MapPin } from "lucide-react";
import type {
  LocationSummary,
  OrganizationSummary,
  ServiceUnitSummary,
} from "@mitrafaskes/shared";
import {
  FormActions,
  type FormStep,
  MasterFaskesFormShell,
} from "./FormLayout";
import { emptyLocation } from "./constants";
import { locationFormSchema } from "./schemas";
import { LocationFormContextStep } from "./LocationFormContextStep";
import { LocationFormDetailsStep } from "./LocationFormDetailsStep";
import { LocationFormIdentityStep } from "./LocationFormIdentityStep";
import type {
  FormMode,
  LocationForm as LocationFormValues,
  SubmitHandler,
  SubmittingKind,
} from "./types";

type LocationFormProps = {
  canWrite: boolean;
  organizations: OrganizationSummary[];
  serviceUnits: ServiceUnitSummary[];
  locations: LocationSummary[];
  submitting: SubmittingKind | null;
  onSubmit: SubmitHandler<LocationFormValues>;
  initialValues?: LocationFormValues;
  mode?: FormMode;
  excludeId?: string;
  onCancel?: () => void;
};

const locationSteps: FormStep[] = [
  {
    label: "Konteks",
    description: "Organisasi, unit, dan lokasi induk",
  },
  {
    label: "Identitas & status",
    description: "Kode, nama, tipe, dan status",
  },
  {
    label: "Data fisik",
    description: "Alamat dan koordinat lanjutan",
  },
];

const locationStepFields: FieldPath<LocationFormValues>[][] = [
  ["organizationId", "serviceUnitId", "parentId"],
  ["code", "name", "type", "mode", "status", "active"],
  [
    "description",
    "physicalTypeCode",
    "addressText",
    "city",
    "postalCode",
    "countryCode",
    "latitude",
    "longitude",
    "altitude",
  ],
];

export function LocationForm({
  canWrite,
  organizations,
  serviceUnits,
  locations,
  submitting,
  onSubmit,
  initialValues,
  mode = "create",
  excludeId,
  onCancel,
}: LocationFormProps) {
  const {
    control,
    formState: { errors, isSubmitting },
    register,
    reset,
    handleSubmit,
    setValue,
    trigger,
  } = useForm<LocationFormValues>({
    resolver: zodResolver(locationFormSchema),
    defaultValues: initialValues ?? emptyLocation,
    mode: "onBlur",
  });
  const [currentStep, setCurrentStep] = useState(0);
  const organizationId = useWatch({ control, name: "organizationId" });

  const submit = handleSubmit(async (values) => {
    if (currentStep !== locationSteps.length - 1) return;

    if (await onSubmit(values)) {
      reset({ ...emptyLocation, organizationId: values.organizationId });
      setCurrentStep(0);
    }
  });

  const goToNextStep = async () => {
    const valid = await trigger(locationStepFields[currentStep], {
      shouldFocus: true,
    });
    if (valid) setCurrentStep((step) => Math.min(step + 1, locationSteps.length - 1));
  };

  const shell = (
    <MasterFaskesFormShell
      icon={MapPin}
      title={mode === "edit" ? "Edit Location / ruangan" : "Tambah Location / ruangan"}
      description="Mulai dari konteks organisasi, lanjutkan ke identitas, lalu lengkapi data fisik bila tersedia."
      steps={locationSteps}
      currentStep={currentStep}
      className="max-w-4xl"
      footer={
        canWrite ? (
          <FormActions
            currentStep={currentStep}
            stepCount={locationSteps.length}
            onCancel={onCancel}
            onBack={() => setCurrentStep((step) => Math.max(step - 1, 0))}
            onNext={() => void goToNextStep()}
            isSubmitting={isSubmitting || submitting === "location"}
            submitLabel={mode === "edit" ? "Simpan perubahan" : "Simpan Location"}
            submittingLabel="Menyimpan..."
          />
        ) : null
      }
    >
      {canWrite ? (
        <>
          {currentStep === 0 ? (
            <LocationFormContextStep
              control={control}
              organizations={organizations}
              serviceUnits={serviceUnits}
              locations={locations}
              organizationId={organizationId}
              excludeId={excludeId}
              setValue={setValue}
            />
          ) : null}
          {currentStep === 1 ? (
            <LocationFormIdentityStep
              control={control}
              errors={errors}
              register={register}
            />
          ) : null}
          {currentStep === 2 ? (
            <LocationFormDetailsStep errors={errors} register={register} />
          ) : null}
        </>
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
