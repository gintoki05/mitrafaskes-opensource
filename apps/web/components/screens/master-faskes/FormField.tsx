import {
  Children,
  isValidElement,
  type AriaAttributes,
  type ReactNode,
} from "react";
import {
  FieldLabel as UiFieldLabel,
} from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export function FieldLabel({
  htmlFor,
  children,
  required,
}: {
  htmlFor: string;
  children: ReactNode;
  required?: boolean | string;
}) {
  return (
    <UiFieldLabel
      htmlFor={htmlFor}
      required={required}
      className="mb-1 block"
    >
      {children}
    </UiFieldLabel>
  );
}

export function SelectField({
  id,
  value,
  onChange,
  children,
  disabled,
  className,
  "aria-label": ariaLabel,
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: AriaAttributes["aria-invalid"];
}) {
  const options = Children.toArray(children).flatMap((child) => {
    if (
      !isValidElement<{
        value?: string;
        disabled?: boolean;
        children?: ReactNode;
      }>(child) ||
      child.type !== "option"
    ) {
      return [];
    }

    const optionValue = child.props.value ?? "";
    return [
      {
        value: optionValue || null,
        label: child.props.children,
        disabled: child.props.disabled,
      },
    ];
  });
  const items = options.map(({ value, label }) => ({ value, label }));

  return (
    <Select
      items={items}
      value={value || null}
      disabled={disabled}
      onValueChange={(nextValue) => onChange(nextValue ?? "")}
    >
      <SelectTrigger
        id={id}
        aria-label={ariaLabel}
        aria-describedby={ariaDescribedBy}
        aria-invalid={ariaInvalid}
        className={cn(
          "clinical-field min-h-9 w-full px-2.5 py-1 text-sm",
          className,
        )}
      >
        <SelectValue
          placeholder={
            options.find((option) => option.value === null)?.label ??
            "Pilih pilihan"
          }
        />
      </SelectTrigger>
      <SelectContent>
        {options.map((option, index) => (
          <SelectItem
            key={`${option.value ?? "empty"}-${index}`}
            value={option.value}
            disabled={option.disabled}
          >
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
