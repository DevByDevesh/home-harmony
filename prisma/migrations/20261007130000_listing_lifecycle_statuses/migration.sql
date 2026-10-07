-- Task 3.3: complete listing lifecycle status vocabulary.
ALTER TYPE "PropertyStatus" ADD VALUE IF NOT EXISTS 'DRAFT';
ALTER TYPE "PropertyStatus" ADD VALUE IF NOT EXISTS 'REJECTED';
ALTER TYPE "PropertyStatus" ADD VALUE IF NOT EXISTS 'SUSPENDED';
ALTER TYPE "PropertyStatus" ADD VALUE IF NOT EXISTS 'DELETED';
