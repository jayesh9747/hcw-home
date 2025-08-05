/*
  Warnings:

  - You are about to drop the `MagicToken` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "MagicToken" DROP CONSTRAINT "MagicToken_userId_fkey";

-- DropTable
DROP TABLE "MagicToken";

-- CreateTable
CREATE TABLE "magic_tokens" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "contact" TEXT NOT NULL,
    "type" "TokenType" NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" INTEGER,

    CONSTRAINT "magic_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "magic_tokens_token_key" ON "magic_tokens"("token");

-- CreateIndex
CREATE INDEX "magic_tokens_token_idx" ON "magic_tokens"("token");

-- AddForeignKey
ALTER TABLE "magic_tokens" ADD CONSTRAINT "magic_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
