/*
  Warnings:

  - A unique constraint covering the columns `[id_number]` on the table `patients` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "patients" ADD COLUMN     "id_number" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "patients_id_number_key" ON "patients"("id_number");
