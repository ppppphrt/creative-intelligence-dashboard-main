import { CalendarDays } from "lucide-react";
import { useDateFilter, DATE_PRESETS, DatePreset } from "@/hooks/useDateFilter";

export default function DateFilterBar() {
  const { preset, setPreset, dateFrom, dateTo } = useDateFilter();

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
        <CalendarDays className="w-3.5 h-3.5" />
        <span className="font-medium">Period</span>
      </div>
      {DATE_PRESETS.map((p) => (
        <button
          key={p.id}
          onClick={() => setPreset(p.id)}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
            preset === p.id
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-background text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"
          }`}
        >
          {p.label}
        </button>
      ))}
      <span className="text-xs text-muted-foreground ml-1">
        {dateFrom} → {dateTo}
      </span>
    </div>
  );
}
