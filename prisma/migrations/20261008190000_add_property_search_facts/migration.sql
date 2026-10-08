-- Phase 12: searchable property age and floor facts.
ALTER TABLE "Property" ADD COLUMN "propertyAgeYears" INTEGER;
ALTER TABLE "Property" ADD COLUMN "floor" INTEGER;
ALTER TABLE "Property" ADD COLUMN "totalFloors" INTEGER;
