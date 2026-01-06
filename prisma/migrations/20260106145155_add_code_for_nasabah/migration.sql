/*
  Warnings:

  - A unique constraint covering the columns `[nasabah_code]` on the table `profiles` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "profiles" ADD COLUMN     "nasabah_code" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "profiles_nasabah_code_key" ON "profiles"("nasabah_code");
