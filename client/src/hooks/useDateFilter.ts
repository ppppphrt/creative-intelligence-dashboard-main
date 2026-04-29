import { useState, useEffect } from "react";
import { addDays, startOfYear, format } from "date-fns";

export type DatePreset = "7d" | "30d" | "90d" | "ytd";

const STORAGE_KEY = "date-filter-preset";
const DEFAULT_PRESET: DatePreset = "30d";

function computeDates(preset: string): { dateFrom: string; dateTo: string } {
  const today = new Date();
  const fmt = (d: Date) => format(d, "yyyy-MM-dd");
  switch (preset) {
    case "7d":  return { dateFrom: fmt(addDays(today, -7)),   dateTo: fmt(today) };
    case "90d": return { dateFrom: fmt(addDays(today, -90)),  dateTo: fmt(today) };
    case "ytd": return { dateFrom: fmt(startOfYear(today)),   dateTo: fmt(today) };
    default:    return { dateFrom: fmt(addDays(today, -30)),  dateTo: fmt(today) };
  }
}

export const DATE_PRESETS: { id: DatePreset; label: string }[] = [
  { id: "7d",  label: "7 days"  },
  { id: "30d", label: "30 days" },
  { id: "90d", label: "90 days" },
  { id: "ytd", label: "Year to date" },
];

export function useDateFilter() {
  const [preset, setPresetState] = useState<DatePreset>(() => {
    return (localStorage.getItem(STORAGE_KEY) as DatePreset) ?? DEFAULT_PRESET;
  });

  const setPreset = (p: DatePreset) => {
    localStorage.setItem(STORAGE_KEY, p);
    setPresetState(p);
    window.dispatchEvent(new StorageEvent("storage", { key: STORAGE_KEY, newValue: p }));
  };

  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) setPresetState(e.newValue as DatePreset);
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  return { preset, setPreset, ...computeDates(preset) };
}
