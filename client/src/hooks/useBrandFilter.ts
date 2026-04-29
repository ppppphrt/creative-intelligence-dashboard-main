import { useState, useEffect } from "react";

export type Brand = {
  id: string;
  label: string;
  accountSuffix: string;
};

export const BRANDS: Brand[] = [
  { id: "infresh", label: "Infresh",  accountSuffix: "627" },
  { id: "laos",    label: "Laos",     accountSuffix: "056" },
  { id: "glowcea", label: "Glowcea",  accountSuffix: ""    },
];

const STORAGE_KEY = "brand-filter";

export function useBrandFilter() {
  const [brandId, setBrandIdState] = useState<string | null>(() => {
    return localStorage.getItem(STORAGE_KEY);
  });

  const setBrandId = (id: string | null) => {
    if (id) localStorage.setItem(STORAGE_KEY, id);
    else localStorage.removeItem(STORAGE_KEY);
    setBrandIdState(id);
    // notify other tabs / components
    window.dispatchEvent(new StorageEvent("storage", { key: STORAGE_KEY, newValue: id }));
  };

  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setBrandIdState(e.newValue);
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  const activeBrand = BRANDS.find((b) => b.id === brandId) ?? null;
  const accountSuffix = activeBrand?.accountSuffix || undefined;

  return { brandId, setBrandId, activeBrand, accountSuffix, BRANDS };
}
