-- CreateEnum
CREATE TYPE "StaffShiftExceptionMode" AS ENUM ('REPLACE', 'ADD');

-- AlterTable
ALTER TABLE "appointments" ADD COLUMN     "consultation_type_id" INTEGER,
ADD COLUMN     "duration_minutes" INTEGER;

-- CreateTable
CREATE TABLE "staff_shifts" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "day_of_week" INTEGER NOT NULL,
    "start_time" TEXT NOT NULL,
    "end_time" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "staff_shifts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff_shift_exceptions" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "date" DATE NOT NULL,
    "mode" "StaffShiftExceptionMode" NOT NULL,
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "staff_shift_exceptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff_shift_exception_periods" (
    "id" SERIAL NOT NULL,
    "exception_id" INTEGER NOT NULL,
    "start_time" TEXT NOT NULL,
    "end_time" TEXT NOT NULL,

    CONSTRAINT "staff_shift_exception_periods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consultation_types" (
    "id" SERIAL NOT NULL,
    "department_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "duration_minutes" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "consultation_types_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "staff_shifts_user_id_day_of_week_is_active_idx" ON "staff_shifts"("user_id", "day_of_week", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "staff_shift_exceptions_user_id_date_key" ON "staff_shift_exceptions"("user_id", "date");

-- CreateIndex
CREATE INDEX "consultation_types_department_id_is_active_idx" ON "consultation_types"("department_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "consultation_types_department_id_name_key" ON "consultation_types"("department_id", "name");

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_consultation_type_id_fkey" FOREIGN KEY ("consultation_type_id") REFERENCES "consultation_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_shifts" ADD CONSTRAINT "staff_shifts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_shift_exceptions" ADD CONSTRAINT "staff_shift_exceptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_shift_exception_periods" ADD CONSTRAINT "staff_shift_exception_periods_exception_id_fkey" FOREIGN KEY ("exception_id") REFERENCES "staff_shift_exceptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consultation_types" ADD CONSTRAINT "consultation_types_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
