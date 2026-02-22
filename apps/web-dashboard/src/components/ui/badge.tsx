import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
  {
    variants: {
      variant: {
        default: "bg-primary/20 text-primary border border-primary/30",
        success: "bg-accent-electric/20 text-accent-electric border border-accent-electric/30",
        warning: "bg-warning/20 text-warning border border-warning/30",
        critical: "bg-critical/20 text-critical border border-critical/30",
        outline: "bg-transparent text-white border border-border-dark"
      }
    },
    defaultVariants: { variant: "default" }
  }
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}
