-- Configurable "gallons remaining" alert threshold per filter.
ALTER TABLE "Filter"
  ADD COLUMN "warnGallonsRemaining" DOUBLE PRECISION NOT NULL DEFAULT 100;
