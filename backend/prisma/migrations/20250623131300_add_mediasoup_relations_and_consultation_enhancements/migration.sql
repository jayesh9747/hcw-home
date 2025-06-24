/*
  Warnings:

  - You are about to drop the column `owner` on the `Consultation` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Consultation" DROP COLUMN "owner";
ALTER TABLE "Consultation" ADD "ownerId" INTEGER;
ALTER TABLE "Consultation" ADD "version" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "Participant" ADD "language" VARCHAR(50);

-- CreateTable
CREATE TABLE "mediasoup_servers" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "maxNumberOfSessions" INTEGER NOT NULL DEFAULT 100,
    "active" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mediasoup_servers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mediasoup_routers" (
    "id" TEXT NOT NULL,
    "consultationId" INTEGER NOT NULL,
    "routerId" TEXT NOT NULL,
    "serverId" TEXT NOT NULL,

    CONSTRAINT "mediasoup_routers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "mediasoup_servers_url_key" ON "mediasoup_servers"("url");

-- CreateIndex
CREATE UNIQUE INDEX "mediasoup_routers_consultationId_key" ON "mediasoup_routers"("consultationId");

-- CreateIndex
CREATE INDEX "mediasoup_routers_routerId_idx" ON "mediasoup_routers"("routerId");

-- CreateIndex
CREATE UNIQUE INDEX "mediasoup_routers_consultationId_serverId_key" ON "mediasoup_routers"("consultationId", "serverId");

-- CreateIndex
CREATE INDEX "Consultation_status_idx" ON "Consultation"("status");

-- CreateIndex
CREATE INDEX "Consultation_ownerId_idx" ON "Consultation"("ownerId");

-- AddForeignKey
ALTER TABLE "Consultation" ADD CONSTRAINT "Consultation_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mediasoup_routers" ADD CONSTRAINT "mediasoup_routers_consultationId_fkey" FOREIGN KEY ("consultationId") REFERENCES "Consultation"("id") ON DELETE NO ACTION;

-- AddForeignKey
ALTER TABLE "mediasoup_routers" ADD CONSTRAINT "mediasoup_routers_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "mediasoup_servers"("id") ON DELETE NO ACTION;
