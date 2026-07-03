import * as React from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";

import { cn } from "@/lib/utils";

type SliderProps = React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root> & {
  variant?: "default" | "temperature";
};

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  SliderProps
>(({ className, variant = "default", ...props }, ref) => (
  <SliderPrimitive.Root
    ref={ref}
    className={cn("relative flex w-full touch-none select-none items-center", className)}
    {...props}
  >
    <SliderPrimitive.Track
      className={cn(
        "relative h-2 w-full grow overflow-hidden rounded-full",
        variant === "temperature" ? "bg-[var(--warm-gray)]" : "bg-primary/20",
      )}
    >
      <SliderPrimitive.Range
        className={cn(
          "absolute h-full rounded-full",
          variant === "temperature"
            ? "bg-gradient-to-r from-[var(--peach)] to-[var(--peach-deep)]"
            : "bg-primary",
        )}
      />
    </SliderPrimitive.Track>
    <SliderPrimitive.Thumb
      className={cn(
        "block rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
        variant === "temperature"
          ? "h-5 w-5 border-[var(--peach-deep)]/40 bg-gradient-to-br from-[var(--peach)] to-[var(--peach-deep)] shadow-[0_2px_8px_rgba(250,158,123,0.35)]"
          : "h-4 w-4 border-primary/50 bg-background shadow",
      )}
    />
  </SliderPrimitive.Root>
));
Slider.displayName = SliderPrimitive.Root.displayName;

export { Slider };
