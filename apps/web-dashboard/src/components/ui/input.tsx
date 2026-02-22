import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, ...props }, ref) => {
  return (
    <input
      ref={ref}
      className={cn(
        "h-9 w-full rounded-md border border-border-dark bg-background-dark/50 px-3 py-1 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-primary/40",
        className
      )}
      {...props}
    />
  );
});
Input.displayName = "Input";
