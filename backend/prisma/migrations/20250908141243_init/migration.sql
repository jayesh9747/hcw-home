/*
  Warnings:

  - You are about to drop the `MediaEvent` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `MediaPermissionStatus` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "public"."FeedbackSatisfaction" AS ENUM ('SATISFIED', 'NEUTRAL', 'DISSATISFIED');

-- DropForeignKey
ALTER TABLE "public"."MediaEvent" DROP CONSTRAINT "MediaEvent_consultationId_fkey";

-- DropForeignKey
ALTER TABLE "public"."MediaEvent" DROP CONSTRAINT "MediaEvent_userId_fkey";

-- DropForeignKey
ALTER TABLE "public"."MediaPermissionStatus" DROP CONSTRAINT "MediaPermissionStatus_consultationId_fkey";

-- DropForeignKey
ALTER TABLE "public"."MediaPermissionStatus" DROP CONSTRAINT "MediaPermissionStatus_userId_fkey";

-- DropTable
DROP TABLE "public"."MediaEvent";

-- DropTable
DROP TABLE "public"."MediaPermissionStatus";

-- CreateTable
CREATE TABLE "public"."media_permission_status" (
    "id" SERIAL NOT NULL,
    "consultationId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "cameraStatus" TEXT NOT NULL,
    "microphoneStatus" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "media_permission_status_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."media_events" (
    "id" SERIAL NOT NULL,
    "consultationId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "type" "public"."MediaEventType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "media_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."consultation_feedback" (
    "id" SERIAL NOT NULL,
    "consultationId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "satisfaction" "public"."FeedbackSatisfaction",
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "consultation_feedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "media_permission_status_consultationId_userId_key" ON "public"."media_permission_status"("consultationId", "userId");

-- CreateIndex
CREATE INDEX "media_events_consultationId_idx" ON "public"."media_events"("consultationId");

-- CreateIndex
CREATE INDEX "media_events_userId_idx" ON "public"."media_events"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "consultation_feedback_consultationId_key" ON "public"."consultation_feedback"("consultationId");

-- CreateIndex
CREATE INDEX "consultation_feedback_consultationId_idx" ON "public"."consultation_feedback"("consultationId");

-- CreateIndex
CREATE INDEX "consultation_feedback_userId_idx" ON "public"."consultation_feedback"("userId");

-- AddForeignKey
ALTER TABLE "public"."media_permission_status" ADD CONSTRAINT "media_permission_status_consultationId_fkey" FOREIGN KEY ("consultationId") REFERENCES "public"."consultation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."media_permission_status" ADD CONSTRAINT "media_permission_status_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."media_events" ADD CONSTRAINT "media_events_consultationId_fkey" FOREIGN KEY ("consultationId") REFERENCES "public"."consultation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."media_events" ADD CONSTRAINT "media_events_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."consultation_feedback" ADD CONSTRAINT "consultation_feedback_consultationId_fkey" FOREIGN KEY ("consultationId") REFERENCES "public"."consultation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."consultation_feedback" ADD CONSTRAINT "consultation_feedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
