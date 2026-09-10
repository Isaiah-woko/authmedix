/*
  Warnings:

  - You are about to drop the column `code` on the `LoginCode` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[seq]` on the table `AuditLog` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `entryHash` to the `AuditLog` table without a default value. This is not possible if the table is not empty.
  - Added the required column `prevHash` to the `AuditLog` table without a default value. This is not possible if the table is not empty.
  - Added the required column `codeHash` to the `LoginCode` table without a default value. This is not possible if the table is not empty.
  - Added the required column `salt` to the `LoginCode` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "AuditLog" ADD COLUMN     "entryHash" TEXT NOT NULL,
ADD COLUMN     "prevHash" TEXT NOT NULL,
ADD COLUMN     "seq" SERIAL NOT NULL;

-- AlterTable
ALTER TABLE "LoginCode" DROP COLUMN "code",
ADD COLUMN     "codeHash" TEXT NOT NULL,
ADD COLUMN     "salt" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "AuditLog_seq_key" ON "AuditLog"("seq");
