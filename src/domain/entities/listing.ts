export type ListingCondition = "NEW" | "USED" | "CERTIFIED";
export type ListingStatus = "AVAILABLE" | "PENDING" | "SOLD" | "REMOVED";
export type FuelType = "PETROL" | "DIESEL" | "HYBRID" | "ELECTRIC";
export type Transmission = "MANUAL" | "AUTOMATIC";

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
