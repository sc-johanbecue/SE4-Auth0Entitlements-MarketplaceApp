"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

export interface RadioOption {
  value: string;
  label: string;
}

interface RadioGroupProps {
  name: string;
  options: RadioOption[];
  value: string | null;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
}

/**
 * Horizontal radio group. One option must be selected.
 * When value is null, the first option (typically "Any") is treated as selected for display.
 */
export function RadioGroup({
  name,
  options,
  value,
  onChange,
  disabled,
  className,
}: RadioGroupProps) {
  const selectedValue = value ?? options[0]?.value ?? "";

  return (
    <div
      role="radiogroup"
      aria-label={name}
      className={cn("flex flex-wrap gap-4", className)}
    >
      {options.map((opt) => (
        <label
          key={opt.value}
          className="flex items-center gap-2 cursor-pointer font-medium text-sm"
        >
          <input
            type="radio"
            name={name}
            value={opt.value}
            checked={selectedValue === opt.value}
            onChange={() => onChange(opt.value)}
            disabled={disabled}
            className="h-4 w-4 border-primary text-primary focus:ring-primary focus:ring-2 focus:ring-offset-2 disabled:opacity-50"
          />
          {opt.label}
        </label>
      ))}
    </div>
  );
}
