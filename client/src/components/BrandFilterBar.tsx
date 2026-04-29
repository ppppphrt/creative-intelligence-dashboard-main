import { useBrandFilter } from "@/hooks/useBrandFilter";
import { Building2 } from "lucide-react";

export default function BrandFilterBar() {
  const { brandId, setBrandId, BRANDS } = useBrandFilter();

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
        <Building2 className="w-3.5 h-3.5" />
        <span className="font-medium">Brand</span>
      </div>
      <button
        onClick={() => setBrandId(null)}
        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
          !brandId
            ? "bg-primary text-primary-foreground border-primary"
            : "bg-background text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"
        }`}
      >
        All Brands
      </button>
      {BRANDS.map((b) => (
        <button
          key={b.id}
          onClick={() => setBrandId(brandId === b.id ? null : b.id)}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
            brandId === b.id
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-background text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"
          }`}
        >
          {b.label}
        </button>
      ))}
    </div>
  );
}
