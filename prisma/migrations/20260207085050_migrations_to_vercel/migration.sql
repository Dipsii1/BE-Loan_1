/*
  Warnings:

  - You are about to drop the column `profile_id` on the `credit_application` table. All the data in the column will be lost.
  - You are about to drop the `profiles` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `user_id` to the `credit_application` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "application_status" DROP CONSTRAINT "application_status_changed_by_fkey";

-- DropForeignKey
ALTER TABLE "credit_application" DROP CONSTRAINT "credit_application_profile_id_fkey";

-- DropForeignKey
ALTER TABLE "profiles" DROP CONSTRAINT "profiles_role_id_fkey";

-- AlterTable
ALTER TABLE "application_status" ALTER COLUMN "changed_by" SET DATA TYPE CHAR(36);

-- AlterTable
ALTER TABLE "credit_application" DROP COLUMN "profile_id",
ADD COLUMN     "user_id" CHAR(36) NOT NULL;

-- DropTable
DROP TABLE "profiles";

-- CreateTable
CREATE TABLE "users" (
    "id" CHAR(36) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "email" VARCHAR(150) NOT NULL,
    "no_phone" VARCHAR(25),
    "agent_code" TEXT,
    "nasabah_code" TEXT,
    "role_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_agent_code_key" ON "users"("agent_code");

-- CreateIndex
CREATE UNIQUE INDEX "users_nasabah_code_key" ON "users"("nasabah_code");

-- CreateIndex
CREATE INDEX "users_role_id_idx" ON "users"("role_id");

-- CreateIndex
CREATE INDEX "application_status_application_id_idx" ON "application_status"("application_id");

-- CreateIndex
CREATE INDEX "application_status_changed_by_idx" ON "application_status"("changed_by");

-- CreateIndex
CREATE INDEX "credit_application_user_id_idx" ON "credit_application"("user_id");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_application" ADD CONSTRAINT "credit_application_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_status" ADD CONSTRAINT "application_status_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
