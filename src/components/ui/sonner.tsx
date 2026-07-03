import { Toaster as Sonner } from "sonner";
import { getResolvedTheme, useTheme } from "@/lib/theme-store";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const toastBase =
  "group toast rounded-xl border shadow-[var(--shadow-warm)] !bg-[var(--surface)] !text-[var(--foreground)] !border-[var(--border)]";

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      className="toaster group z-50"
      toastOptions={{
        classNames: {
          toast: toastBase,
          title: "group-[.toast]:!text-[var(--foreground)] group-[.toast]:font-semibold",
          description: "group-[.toast]:!text-[var(--toast-description)] group-[.toast]:opacity-100",
          actionButton:
            "group-[.toast]:!bg-[var(--navy)] group-[.toast]:!text-white group-[.toast]:rounded-lg group-[.toast]:font-semibold group-[.toast]:text-xs",
          cancelButton:
            "group-[.toast]:!bg-[var(--muted)] group-[.toast]:!text-[var(--foreground)] group-[.toast]:rounded-lg",
          closeButton:
            "group-[.toast]:!bg-[var(--muted)] group-[.toast]:!text-[var(--foreground)] group-[.toast]:!border-[var(--border)]",
          success: `${toastBase} !border-[color-mix(in_srgb,var(--success-foreground)_35%,var(--border))]`,
          error: `${toastBase} !border-[color-mix(in_srgb,var(--fever-high)_35%,var(--border))]`,
          info: toastBase,
          warning: `${toastBase} !border-[color-mix(in_srgb,var(--peach-deep)_40%,var(--border))]`,
        },
      }}
      {...props}
    />
  );
};

/** Syncs Sonner theme with app light/dark preference. */
function AppToaster(props: Omit<ToasterProps, "theme">) {
  useTheme();
  return <Toaster theme={getResolvedTheme()} {...props} />;
}

export { Toaster, AppToaster };
