-- Name: 0003_suggestion_prefix_indexes.up
-- Description: Indexes available listings for case-insensitive make, model, and location suggestions.

CREATE INDEX idx_listings_make_prefix
  ON vehicle_listings (lower(make) text_pattern_ops)
  WHERE status = 'AVAILABLE';

CREATE INDEX idx_listings_model_prefix
  ON vehicle_listings (lower(model) text_pattern_ops)
  WHERE status = 'AVAILABLE';

CREATE INDEX idx_listings_location_prefix
  ON vehicle_listings (lower(location) text_pattern_ops)
  WHERE status = 'AVAILABLE';
