"use client";

import * as React from "react";
import { Combobox as ComboboxPrimitive } from "@base-ui/react/combobox";
import { CheckIcon, ChevronDownIcon, XIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type ComboboxOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

type ComboboxFieldProps = {
  id?: string;
  value: string;
  options: ComboboxOption[];
  onChange: (value: string) => void;
  placeholder: React.ReactNode;
  emptyMessage?: React.ReactNode;
  disabled?: boolean;
  clearable?: boolean;
  className?: string;
  inputClassName?: string;
  "aria-label"?: string;
};

export function ComboboxField({
  id,
  value,
  options,
  onChange,
  placeholder,
  emptyMessage = "Tidak ada pilihan yang cocok.",
  disabled = false,
  clearable = true,
  className,
  inputClassName,
  "aria-label": ariaLabel,
}: ComboboxFieldProps) {
  const generatedId = React.useId();
  const selectedOption = options.find((option) => option.value === value) ?? null;

  return (
    <ComboboxPrimitive.Root<ComboboxOption>
      items={options}
      value={selectedOption}
      disabled={disabled}
      itemToStringLabel={(option) => option.label}
      itemToStringValue={(option) => option.value}
      isItemEqualToValue={(option, selected) =>
        option.value === selected.value
      }
      onValueChange={(option) => onChange(option?.value ?? "")}
    >
      <div className={cn("relative w-full", className)}>
        <ComboboxPrimitive.Input
          id={id ?? generatedId}
          aria-label={ariaLabel}
          placeholder={placeholder}
          className={cn(
            "clinical-field min-h-8 w-full px-2.5 py-1 pr-14 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50",
            inputClassName,
          )}
        />
        <div className="absolute inset-y-0 right-1 flex items-center gap-0.5">
          {clearable && selectedOption ? (
            <ComboboxPrimitive.Clear
              type="button"
              className="inline-flex size-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Hapus pilihan"
            >
              <XIcon className="size-3.5" aria-hidden="true" />
            </ComboboxPrimitive.Clear>
          ) : null}
          <ComboboxPrimitive.Trigger
            type="button"
            className="inline-flex size-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none"
            aria-label="Buka pilihan"
          >
            <ChevronDownIcon className="size-4" aria-hidden="true" />
          </ComboboxPrimitive.Trigger>
        </div>
      </div>

      <ComboboxPrimitive.Portal>
        <ComboboxPrimitive.Positioner
          side="bottom"
          sideOffset={4}
          align="start"
          className="isolate z-50"
        >
          <ComboboxPrimitive.Popup className="relative max-h-(--available-height) w-(--anchor-width) max-w-(--available-width) min-w-56 origin-(--transform-origin) overflow-hidden rounded-lg bg-popover text-popover-foreground shadow-md ring-1 ring-foreground/10 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95">
            <ComboboxPrimitive.Empty className="px-3 py-2 text-sm text-muted-foreground">
              {emptyMessage}
            </ComboboxPrimitive.Empty>
            <ComboboxPrimitive.List className="max-h-[min(20rem,var(--available-height))] overflow-y-auto p-1">
              {(option: ComboboxOption) => (
                <ComboboxPrimitive.Item
                  key={option.value}
                  value={option}
                  disabled={option.disabled}
                  className="relative flex w-full cursor-default items-center gap-2 rounded-md py-1.5 pr-8 pl-2 text-sm outline-none select-none data-highlighted:bg-accent data-highlighted:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50"
                >
                  <span className="min-w-0 flex-1 truncate">{option.label}</span>
                  <ComboboxPrimitive.ItemIndicator className="pointer-events-none absolute right-2 flex size-4 items-center justify-center">
                    <CheckIcon className="size-4" aria-hidden="true" />
                  </ComboboxPrimitive.ItemIndicator>
                </ComboboxPrimitive.Item>
              )}
            </ComboboxPrimitive.List>
          </ComboboxPrimitive.Popup>
        </ComboboxPrimitive.Positioner>
      </ComboboxPrimitive.Portal>
    </ComboboxPrimitive.Root>
  );
}
