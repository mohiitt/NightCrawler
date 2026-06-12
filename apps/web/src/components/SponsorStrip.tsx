import { SPONSORS } from "@/lib/demoScript";

export function SponsorStrip() {
  return (
    <div className="sponsor-strip">
      {SPONSORS.map((name) => (
        <span key={name} className="sponsor-pill">
          {name}
        </span>
      ))}
    </div>
  );
}
