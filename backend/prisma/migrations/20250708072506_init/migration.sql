-- CreateTable
CREATE TABLE "ConsultationRating" (
    "id" SERIAL NOT NULL,
    "consultationId" INTEGER NOT NULL,
    "patientId" INTEGER NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConsultationRating_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ConsultationRating_consultationId_key" ON "ConsultationRating"("consultationId");

-- CreateIndex
CREATE INDEX "ConsultationRating_patientId_idx" ON "ConsultationRating"("patientId");

-- AddForeignKey
ALTER TABLE "ConsultationRating" ADD CONSTRAINT "ConsultationRating_consultationId_fkey" FOREIGN KEY ("consultationId") REFERENCES "Consultation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsultationRating" ADD CONSTRAINT "ConsultationRating_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
