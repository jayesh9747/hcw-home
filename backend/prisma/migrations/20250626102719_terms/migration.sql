/*
  Warnings:

  - You are about to drop the `practitioners` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `organizationId` to the `terms` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "practitioners" DROP CONSTRAINT "practitioners_userId_fkey";

-- AlterTable
ALTER TABLE "terms" ADD COLUMN     "organizationId" INTEGER NOT NULL;

-- DropTable
DROP TABLE "practitioners";

-- AddForeignKey
ALTER TABLE "terms" ADD CONSTRAINT "terms_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
