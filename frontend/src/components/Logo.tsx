import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
}

export function Logo({ className }: LogoProps) {
  return (
    <img
      src="/logo.png"
      alt="interview68"
      width={512}
      height={144}
      className={cn("h-9 w-auto shrink-0 object-contain", className)}
    />
  );
}