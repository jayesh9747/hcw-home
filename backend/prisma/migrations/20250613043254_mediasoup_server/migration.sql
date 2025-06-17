/*
  Warnings:

  - A unique constraint covering the columns `[name]` on the table `organizations` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Participant" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT false;

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

-- CreateIndex
CREATE UNIQUE INDEX "mediasoup_servers_url_key" ON "mediasoup_servers"("url");

-- CreateIndex
CREATE UNIQUE INDEX "organizations_name_key" ON "organizations"("name");
