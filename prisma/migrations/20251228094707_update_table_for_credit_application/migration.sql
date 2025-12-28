/*
  Warnings:

  - Added the required column `tempat_lahir` to the `credit_application` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "credit_application" ADD COLUMN     "tempat_lahir" VARCHAR(100) NOT NULL;
