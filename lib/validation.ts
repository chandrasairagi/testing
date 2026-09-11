import { withinHyderabad } from "@/lib/hyderabad";
import type { Availability, EntryPayload, EntryType, Furnishing, ListingKind } from "@/lib/types";

const ENTRY_TYPES: EntryType[] = ["rent_report", "listing", "seeker"];
const LISTING_KINDS: ListingKind[] = ["whole_flat", "room"];
const FURNISHING: Furnishing[] = ["Furnished", "Semi-furnished", "Unfurnished"];
const AVAILABILITY: Availability[] = ["asap", "next_month", "flexible", "occupied"];

function cleanText(value: unknown, max = 500) {
  if (typeof value !== "string") return null;
  const clean = value.trim().replace(/\s+/g, " ");
  return clean ? clean.slice(0, max) : null;
}

function cleanNumber(value: unknown, min: number, max: number) {
  const num = Number(value);
  return Number.isFinite(num) && num >= min && num <= max ? num : null;
}

export function validateEntryPayload(raw: unknown): { data?: EntryPayload; error?: string } {
  if (!raw || typeof raw !== "object") return { error: "Invalid request body." };
  const input = raw as Record<string, unknown>;
  if (typeof input.website === "string" && input.website.trim()) return { error: "Submission rejected." };

  const entryType = input.entry_type as EntryType;
  if (!ENTRY_TYPES.includes(entryType)) return { error: "Invalid entry type." };
  const listingKind = (input.listing_kind || "whole_flat") as ListingKind;
  if (!LISTING_KINDS.includes(listingKind)) return { error: "Invalid listing type." };
  const locality = cleanText(input.locality, 100);
  if (!locality || locality.length < 2) return { error: "Locality is required." };

  const bhk = cleanNumber(input.bhk, 1, 5);
  const rent = cleanNumber(input.rent, 1000, 1_000_000);
  const lat = cleanNumber(input.lat, -90, 90);
  const lng = cleanNumber(input.lng, -180, 180);
  if (bhk == null || rent == null || lat == null || lng == null) return { error: "BHK, rent/budget and location are required." };
  if (!withinHyderabad(lat, lng)) return { error: "Location must be inside the Hyderabad service area." };

  const furnishing = input.furnishing && FURNISHING.includes(input.furnishing as Furnishing) ? input.furnishing as Furnishing : null;
  const availability = input.availability && AVAILABILITY.includes(input.availability as Availability) ? input.availability as Availability : null;
  const deposit = input.deposit == null || input.deposit === "" ? null : cleanNumber(input.deposit, 0, 5_000_000);
  const parking = input.parking == null || input.parking === "" ? null : cleanNumber(input.parking, 0, 5);
  const sqft = input.sqft == null || input.sqft === "" ? null : cleanNumber(input.sqft, 100, 20_000);

  if (input.deposit != null && input.deposit !== "" && deposit == null) return { error: "Invalid deposit." };
  if (input.parking != null && input.parking !== "" && parking == null) return { error: "Invalid parking count." };
  if (input.sqft != null && input.sqft !== "" && sqft == null) return { error: "Invalid square footage." };

  return { data: {
    entry_type: entryType, listing_kind: listingKind, locality, bhk, rent, deposit, furnishing,
    gated: typeof input.gated === "boolean" ? input.gated : input.gated === "true" ? true : input.gated === "false" ? false : null,
    maintenance_included: typeof input.maintenance_included === "boolean" ? input.maintenance_included : null,
    availability, parking, sqft,
    building: cleanText(input.building, 150), tenant_preference: cleanText(input.tenant_preference, 50),
    pets: cleanText(input.pets, 30), gender_preference: cleanText(input.gender_preference, 30),
    food_preference: cleanText(input.food_preference, 30), smoking_preference: cleanText(input.smoking_preference, 30),
    notes: cleanText(input.notes, 1000), lat, lng, contact: cleanText(input.contact, 200), website: null
  }};
}

export function isValidEmail(value: string) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value); }
