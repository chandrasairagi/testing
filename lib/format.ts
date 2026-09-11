export function formatMoney(value: number | null | undefined) {
  if (value == null) return "—";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(value);
}

export function shortRent(value: number) {
  if (value >= 100000) {
    return `₹${(value / 100000).toFixed(value % 100000 === 0 ? 0 : 1)}L`;
  }
  return `₹${Math.round(value / 1000)}k`;
}

export function slugifyLocality(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-");
}

export function titleFromSlug(value: string) {
  return decodeURIComponent(value).replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
