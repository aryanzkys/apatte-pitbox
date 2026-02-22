"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type SwitchProps = {
  checked: boolean;
  onCheckedChange: (value: boolean) => void;
  disabled?: boolean;
  className?: string;
  id?: string;
};

export function Switch({ checked, onCheckedChange, disabled, className, id }: SwitchProps) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "inline-flex h-6 w-11 items-center rounded-full border border-border-dark transition-colors",
        checked ? "bg-primary" : "bg-surface-dark",
        disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
        className
      )}
    >
      <span
        className={cn(
          "block h-5 w-5 rounded-full bg-white transition-transform",
          checked ? "translate-x-5" : "translate-x-0.5"
        )}
      />
    </button>
  );
}
