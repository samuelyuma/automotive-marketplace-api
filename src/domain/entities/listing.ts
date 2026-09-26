export const LISTING_CONDITIONS = ["NEW", "USED", "CERTIFIED"] as const;
export type ListingCondition = (typeof LISTING_CONDITIONS)[number];

export const FUEL_TYPES = ["PETROL", "DIESEL", "HYBRID", "ELECTRIC"] as const;
export type FuelType = (typeof FUEL_TYPES)[number];

export const TRANSMISSIONS = ["MANUAL", "AUTOMATIC"] as const;
export type Transmission = (typeof TRANSMISSIONS)[number];

export const LISTING_STATUSES = [
  "AVAILABLE",
  "PENDING",
  "SOLD",
  "REMOVED",
] as const;
export type ListingStatus = (typeof LISTING_STATUSES)[number];

export const UPDATABLE_LISTING_STATUSES = LISTING_STATUSES.filter(
  (s): s is Exclude<ListingStatus, "REMOVED"> => s !== "REMOVED",
);

export type Listing = {
  id: string;
  category_id: string;
  make: string;
  model: string;
  year: number;
  price: number;
  mileage: number;
  condition: ListingCondition;
  color: string;
  location: string;
  status: ListingStatus;
  image_url: string | null;
  fuel_type: FuelType | null;
  transmission: Transmission | null;
  engine_cc: number | null;
  created_at: Date;
  updated_at: Date;
};

export type NewListing = Omit<
  Listing,
  | "id"
  | "status"
  | "image_url"
  | "fuel_type"
  | "transmission"
  | "engine_cc"
  | "created_at"
  | "updated_at"
> &
  Partial<
    Pick<Listing, "image_url" | "fuel_type" | "transmission" | "engine_cc">
  >;

export type UpdateListing = Partial<
  Omit<Listing, "id" | "created_at" | "updated_at" | "status"> & {
    status: Exclude<ListingStatus, "REMOVED">;
  }
>;

export type SoftDeletedListing = Pick<Listing, "id" | "updated_at"> & {
  status: "REMOVED";
};
