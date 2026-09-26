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
  attributes?: ListingAttributeValue[];
};

export type SubmittedAttribute = {
  attribute_definition_id: string;
  value: string | number | boolean;
};

// Validation fills only the column that matches the definition's type.
export type ValidatedListingAttribute = {
  attribute_definition_id: string;
  text: string | null;
  number: number | null;
  bool: boolean | null;
};

export type ListingAttributeValue = {
  key: string;
  label: string;
  value: string | number | boolean;
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
  | "attributes"
> &
  Partial<
    Pick<Listing, "image_url" | "fuel_type" | "transmission" | "engine_cc">
  > & { attributes?: SubmittedAttribute[] };

export type UpdateListing = Partial<
  Omit<
    Listing,
    "id" | "created_at" | "updated_at" | "status" | "attributes"
  > & {
    status: Exclude<ListingStatus, "REMOVED">;
  }
> & { attributes?: SubmittedAttribute[] };

export type SoftDeletedListing = Pick<Listing, "id" | "updated_at"> & {
  status: "REMOVED";
};
