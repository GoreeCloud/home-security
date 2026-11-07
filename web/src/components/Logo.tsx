import { cn } from "@/lib/utils";

// Temporary neutral import glyph, not finalized GoreeCloud product artwork.
type LogoProps = { className?: string };
export default function Logo({ className }: LogoProps) {
  return (
    <svg viewBox="0 0 128 128" className={cn("fill-none stroke-current", className)} role="img" aria-label="GoreeCloud Home Security camera">
      <rect x="19" y="35" width="90" height="59" rx="13" strokeWidth="7" />
      <circle cx="64" cy="64" r="20" strokeWidth="7" />
      <circle cx="91" cy="48" r="4" className="fill-current stroke-none" />
    </svg>
  );
}
