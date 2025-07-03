-- AlterEnum
ALTER TYPE "ConsultationStatus" ADD VALUE 'TERMINATED_OPEN';

-- AlterTable
ALTER TABLE "Consultation" ADD COLUMN     "deletionScheduledAt" TIMESTAMP(3),
ADD COLUMN     "isDeleted" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Participant" ADD COLUMN     "lastActiveAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "DeletedConsultationLog" (
    "id" SERIAL NOT NULL,
    "consultationId" INTEGER NOT NULL,
    "deletedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reason" TEXT,

    CONSTRAINT "DeletedConsultationLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DeletedConsultationLog_consultationId_idx" ON "DeletedConsultationLog"("consultationId");

-- AddForeignKey
ALTER TABLE "DeletedConsultationLog" ADD CONSTRAINT "DeletedConsultationLog_consultationId_fkey" FOREIGN KEY ("consultationId") REFERENCES "Consultation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
