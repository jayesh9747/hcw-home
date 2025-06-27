/*
  Warnings:

  - You are about to drop the column `isLatest` on the `terms` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "terms" DROP COLUMN "isLatest",
ADD COLUMN     "version" DOUBLE PRECISION NOT NULL DEFAULT 1.0;

-- CreateTable
CREATE TABLE "practitioners" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "TermsVersion" VARCHAR(100),
    "AcceptedAt" TIMESTAMP(3),

    CONSTRAINT "practitioners_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "practitioners_userId_key" ON "practitioners"("userId");

-- AddForeignKey
ALTER TABLE "practitioners" ADD CONSTRAINT "practitioners_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
