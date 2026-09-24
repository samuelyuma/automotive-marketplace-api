export type ListingCondition = "NEW" | "USED" | "CERTIFIED";
export type ListingStatus = "AVAILABLE" | "PENDING" | "SOLD";
export type FuelType = "PETROL" | "DIESEL" | "HYBRID" | "ELECTRIC";
export type Transmission = "MANUAL" | "AUTOMATIC";

export type Listing = {
  id: string;
  category_id: string;
  seller_id: string;
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
  "id" | "status" | "created_at" | "updated_at"
>;

export type UpdateListing = Partial<
  Omit<Listing, "id" | "seller_id" | "created_at" | "updated_at">
>;
