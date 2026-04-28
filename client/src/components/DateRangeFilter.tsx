import { Button } from "@/components/ui/button";
import { Calendar } from "lucide-react";
import { useState } from "react";
import { addDays, format, startOfMonth, endOfMonth, startOfYear, endOfYear } from "date-fns";

interface DateRange {
  from: Date;
  to: Date;
}

interface DateRangeFilterProps {
  onDateRangeChange: (range: DateRange) => void;
  defaultRange?: "7d" | "30d" | "90d" | "ytd" | "custom";
}

export default function DateRangeFilter({
  onDateRangeChange,
  defaultRange = "30d",
}: DateRangeFilterProps) {
  const today = new Date();
  const [selectedRange, setSelectedRange] = useState(defaultRange);
  const [customFrom, setCustomFrom] = useState<string>(format(addDays(today, -30), "yyyy-MM-dd"));
  const [customTo, setCustomTo] = useState<string>(format(today, "yyyy-MM-dd"));

  const getDateRange = (range: string): DateRange => {
    switch (range) {
      case "7d":
        return { from: addDays(today, -7), to: today };
      case "30d":
        return { from: addDays(today, -30), to: today };
      case "90d":
        return { from: addDays(today, -90), to: today };
      case "ytd":
        return { from: startOfYear(today), to: today };
      case "custom":
        return { from: new Date(customFrom), to: new Date(customTo) };
      default:
        return { from: addDays(today, -30), to: today };
    }
  };

  const handleRangeSelect = (range: "7d" | "30d" | "90d" | "ytd" | "custom") => {
    setSelectedRange(range);
    onDateRangeChange(getDateRange(range));
  };

  const handleCustomDateChange = () => {
    setSelectedRange("custom");
    onDateRangeChange(getDateRange("custom"));
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button
          variant={selectedRange === "7d" ? "default" : "outline"}
          size="sm"
          onClick={() => handleRangeSelect("7d")}
        >
          Last 7 Days
        </Button>
        <Button
          variant={selectedRange === "30d" ? "default" : "outline"}
          size="sm"
          onClick={() => handleRangeSelect("30d")}
        >
          Last 30 Days
        </Button>
        <Button
          variant={selectedRange === "90d" ? "default" : "outline"}
          size="sm"
          onClick={() => handleRangeSelect("90d")}
        >
          Last 90 Days
        </Button>
        <Button
          variant={selectedRange === "ytd" ? "default" : "outline"}
          size="sm"
          onClick={() => handleRangeSelect("ytd")}
        >
          Year to Date
        </Button>
        <Button
          variant={selectedRange === "custom" ? "default" : "outline"}
          size="sm"
          onClick={() => setSelectedRange("custom")}
        >
          <Calendar className="w-4 h-4 mr-2" />
          Custom
        </Button>
      </div>

      {selectedRange === "custom" && (
        <div className="flex gap-4 p-4 bg-accent/50 rounded-lg">
          <div className="flex-1">
            <label className="text-sm font-medium">From</label>
            <input
              type="date"
              value={customFrom}
              onChange={(e) => {
                setCustomFrom(e.target.value);
                handleCustomDateChange();
              }}
              className="w-full mt-1 px-3 py-2 border border-border rounded-lg bg-background"
            />
          </div>
          <div className="flex-1">
            <label className="text-sm font-medium">To</label>
            <input
              type="date"
              value={customTo}
              onChange={(e) => {
                setCustomTo(e.target.value);
                handleCustomDateChange();
              }}
              className="w-full mt-1 px-3 py-2 border border-border rounded-lg bg-background"
            />
          </div>
        </div>
      )}

      <p className="text-sm text-muted-foreground">
        {format(getDateRange(selectedRange).from, "MMM dd, yyyy")} -{" "}
        {format(getDateRange(selectedRange).to, "MMM dd, yyyy")}
      </p>
    </div>
  );
}
