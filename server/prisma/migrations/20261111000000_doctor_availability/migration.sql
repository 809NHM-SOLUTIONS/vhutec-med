-- CreateTable
CREATE TABLE "doctor_availability" (
    "id" SERIAL NOT NULL,
    "doctor_id" INTEGER NOT NULL,
    "start_time" TEXT NOT NULL DEFAULT '08:00',
    "end_time" TEXT NOT NULL DEFAULT '15:00',
    "slot_minutes" INTEGER NOT NULL DEFAULT 60,
    "working_days" INTEGER[] DEFAULT ARRAY[1, 2, 3, 4, 5]::INTEGER[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "doctor_availability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "doctor_unavailable_dates" (
    "id" SERIAL NOT NULL,
    "doctor_id" INTEGER NOT NULL,
    "date" DATE NOT NULL,
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "doctor_unavailable_dates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "doctor_availability_doctor_id_key" ON "doctor_availability"("doctor_id");

-- CreateIndex
CREATE INDEX "doctor_unavailable_dates_doctor_id_date_idx" ON "doctor_unavailable_dates"("doctor_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "doctor_unavailable_dates_doctor_id_date_key" ON "doctor_unavailable_dates"("doctor_id", "date");

-- AddForeignKey
ALTER TABLE "doctor_availability" ADD CONSTRAINT "doctor_availability_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "doctors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doctor_unavailable_dates" ADD CONSTRAINT "doctor_unavailable_dates_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "doctors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Prevent double booking: one non-cancelled appointment per doctor, day and time slot.
-- (Run 2-check-duplicates.sql first; this fails if duplicates already exist.)
CREATE UNIQUE INDEX "appointments_doctor_slot_active_key"
  ON "appointments" ("doctor_id", (date_trunc('day', "date")), "time_slot")
  WHERE "status" NOT IN ('CANCELLED', 'MISSED');
