import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "destructive" | "outline" | "success" | "warning";
}

const badgeVariants = {
  default: "bg-primary/20 text-primary border-primary/30",
  secondary: "bg-surface-light text-gray-400 border-surface-light",
  destructive: "bg-accent-rose/20 text-accent-rose border-accent-rose/30",
  outline: "text-gray-400 border-surface-light",
  success: "bg-accent-green/20 text-accent-green border-accent-green/30",
  warning: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
};

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors",
        badgeVariants[variant],
        className
      )}
      {...props}
    />
  );
}

export { Badge };
