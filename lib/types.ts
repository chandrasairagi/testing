export type EntryType = "rent_report" | "listing" | "seeker";
export type ListingKind = "whole_flat" | "room";
export type Furnishing = "Furnished" | "Semi-furnished" | "Unfurnished";
export type Availability = "asap" | "next_month" | "flexible" | "occupied";

export interface RentEntry {
  id: string;
  entry_type: EntryType;
  listing_kind: ListingKind;
  locality: string;
  bhk: number;
  rent: number;
  deposit: number | null;
  furnishing: Furnishing | null;
  gated: boolean | null;
  maintenance_included: boolean | null;
  availability: Availability | null;
  parking: number | null;
  sqft: number | null;
  building: string | null;
  tenant_preference: string | null;
  pets: string | null;
  gender_preference: string | null;
  food_preference: string | null;
  smoking_preference: string | null;
  notes: string | null;
  lat: number;
  lng: number;
  status: "active" | "hidden" | "expired";
  is_verified: boolean;
  created_at: string;
}

export interface EntryPayload {
  entry_type: EntryType;
  listing_kind?: ListingKind;
  locality: string;
  bhk: number;
  rent: number;
  deposit?: number | null;
  furnishing?: Furnishing | null;
  gated?: boolean | null;
  maintenance_included?: boolean | null;
  availability?: Availability | null;
  parking?: number | null;
  sqft?: number | null;
  building?: string | null;
  tenant_preference?: string | null;
  pets?: string | null;
  gender_preference?: string | null;
  food_preference?: string | null;
  smoking_preference?: string | null;
  notes?: string | null;
  lat: number;
  lng: number;
  contact?: string | null;
  website?: string | null;
}

export interface MapFilters {
  view: "all" | "listing" | "seeker";
  bhk: string;
  listingKind: string;
  minRent: string;
  maxRent: string;
  furnishing: string;
  gated: string;
  nearMetro: boolean;
  availableNow: boolean;
}

export interface BoundsLiteral {
  south: number;
  west: number;
  north: number;
  east: number;
}
