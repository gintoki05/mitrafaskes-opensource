import {
  Children,
  isValidElement,
  type ReactNode,
} from "react";
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
}: {
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="mb-1 block text-xs font-semibold text-foreground"
    >
      {children}
    </label>
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
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
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

  return (
    <Select
      value={value || null}
      disabled={disabled}
      onValueChange={(nextValue) => onChange(nextValue ?? "")}
    >
      <SelectTrigger
        id={id}
        aria-label={ariaLabel}
        className={cn(
          "clinical-field min-h-8 w-full px-2.5 py-1 text-sm",
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
