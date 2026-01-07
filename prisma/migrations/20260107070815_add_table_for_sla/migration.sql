-- DropIndex
DROP INDEX "credit_application_kode_pengajuan_idx";

-- DropIndex
DROP INDEX "credit_application_nik_idx";

-- CreateTable
CREATE TABLE "application_sla" (
    "id" SERIAL NOT NULL,
    "application_id" INTEGER NOT NULL,
    "from_status" "StatusKredit" NOT NULL,
    "to_status" "StatusKredit" NOT NULL,
    "start_time" TIMESTAMP(3) NOT NULL,
    "end_time" TIMESTAMP(3) NOT NULL,
    "duration_minutes" INTEGER NOT NULL,
    "catatan" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "application_sla_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "application_sla_application_id_idx" ON "application_sla"("application_id");

-- AddForeignKey
ALTER TABLE "application_sla" ADD CONSTRAINT "application_sla_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "credit_application"("id") ON DELETE CASCADE ON UPDATE CASCADE;
