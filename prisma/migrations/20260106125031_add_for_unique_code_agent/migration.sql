/*
  Warnings:

  - A unique constraint covering the columns `[agent_code]` on the table `profiles` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "profiles" ADD COLUMN     "agent_code" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "profiles_agent_code_key" ON "profiles"("agent_code");
