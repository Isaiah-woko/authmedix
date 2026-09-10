-- CreateEnum
CREATE TYPE "Role" AS ENUM ('DOCTOR', 'NURSE', 'PHARMACIST', 'LAB', 'ADMIN');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'LOCKED');

-- CreateEnum
CREATE TYPE "RecordType" AS ENUM ('NOTE', 'LAB', 'PRESCRIPTION', 'UPLOAD');

-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('PENDING', 'APPROVED', 'DENIED');

-- CreateEnum
CREATE TYPE "PassportType" AS ENUM ('STANDARD', 'REFERRAL', 'BREAK_GLASS');

-- CreateEnum
CREATE TYPE "PassportStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'REVOKED');

-- CreateEnum
CREATE TYPE "BreakGlassReason" AS ENUM ('LIFE_THREATENING', 'UNCONSCIOUS_UNRESPONSIVE', 'MEDICATION_ALLERGY_EMERGENCY', 'TRAUMA', 'CRITICAL_DIAGNOSTIC_INFO', 'OTHER');

-- CreateTable
CREATE TABLE "Hospital" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "trustedCidr" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Hospital_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "healthId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT true,
    "role" "Role" NOT NULL,
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "sessionTtlHrs" INTEGER NOT NULL DEFAULT 6,
    "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0,
    "hospitalId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoginCode" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoginCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Patient" (
    "id" TEXT NOT NULL,
    "patientCode" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "dob" TIMESTAMP(3) NOT NULL,
    "allergies" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Patient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Record" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "type" "RecordType" NOT NULL,
    "content" TEXT NOT NULL,
    "contentHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Record_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PassportRequest" (
    "id" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "scope" TEXT[],
    "status" "RequestStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "denialReason" TEXT,
    "resultingPassportId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PassportRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccessPassport" (
    "id" TEXT NOT NULL,
    "type" "PassportType" NOT NULL DEFAULT 'STANDARD',
    "status" "PassportStatus" NOT NULL DEFAULT 'ACTIVE',
    "userId" TEXT NOT NULL,
    "grantedById" TEXT,
    "patientId" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "scope" TEXT[],
    "reasonCategory" "BreakGlassReason",
    "reasonDetail" TEXT,
    "flagged" BOOLEAN NOT NULL DEFAULT false,
    "reviewed" BOOLEAN NOT NULL DEFAULT false,
    "reviewedById" TEXT,
    "reviewNote" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "revokedById" TEXT,
    "revokedAt" TIMESTAMP(3),
    "revokeReason" TEXT,
    "renewalCount" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccessPassport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "patientId" TEXT,
    "action" TEXT NOT NULL,
    "outcome" TEXT NOT NULL,
    "reason" TEXT,
    "flagged" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Hospital_code_key" ON "Hospital"("code");

-- CreateIndex
CREATE UNIQUE INDEX "User_healthId_key" ON "User"("healthId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_hospitalId_idx" ON "User"("hospitalId");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "User_status_idx" ON "User"("status");

-- CreateIndex
CREATE INDEX "User_healthId_email_idx" ON "User"("healthId", "email");

-- CreateIndex
CREATE INDEX "LoginCode_userId_used_expiresAt_idx" ON "LoginCode"("userId", "used", "expiresAt");

-- CreateIndex
CREATE INDEX "LoginCode_createdAt_idx" ON "LoginCode"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Patient_patientCode_key" ON "Patient"("patientCode");

-- CreateIndex
CREATE INDEX "Patient_hospitalId_idx" ON "Patient"("hospitalId");

-- CreateIndex
CREATE INDEX "Patient_patientCode_idx" ON "Patient"("patientCode");

-- CreateIndex
CREATE INDEX "Patient_name_idx" ON "Patient"("name");

-- CreateIndex
CREATE INDEX "Record_patientId_idx" ON "Record"("patientId");

-- CreateIndex
CREATE INDEX "Record_authorId_idx" ON "Record"("authorId");

-- CreateIndex
CREATE INDEX "Record_type_idx" ON "Record"("type");

-- CreateIndex
CREATE INDEX "Record_createdAt_idx" ON "Record"("createdAt");

-- CreateIndex
CREATE INDEX "Record_patientId_type_idx" ON "Record"("patientId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "PassportRequest_resultingPassportId_key" ON "PassportRequest"("resultingPassportId");

-- CreateIndex
CREATE INDEX "PassportRequest_requesterId_idx" ON "PassportRequest"("requesterId");

-- CreateIndex
CREATE INDEX "PassportRequest_patientId_idx" ON "PassportRequest"("patientId");

-- CreateIndex
CREATE INDEX "PassportRequest_status_idx" ON "PassportRequest"("status");

-- CreateIndex
CREATE INDEX "PassportRequest_createdAt_idx" ON "PassportRequest"("createdAt");

-- CreateIndex
CREATE INDEX "PassportRequest_patientId_status_idx" ON "PassportRequest"("patientId", "status");

-- CreateIndex
CREATE INDEX "AccessPassport_userId_idx" ON "AccessPassport"("userId");

-- CreateIndex
CREATE INDEX "AccessPassport_patientId_idx" ON "AccessPassport"("patientId");

-- CreateIndex
CREATE INDEX "AccessPassport_status_idx" ON "AccessPassport"("status");

-- CreateIndex
CREATE INDEX "AccessPassport_type_idx" ON "AccessPassport"("type");

-- CreateIndex
CREATE INDEX "AccessPassport_flagged_reviewed_idx" ON "AccessPassport"("flagged", "reviewed");

-- CreateIndex
CREATE INDEX "AccessPassport_expiresAt_idx" ON "AccessPassport"("expiresAt");

-- CreateIndex
CREATE INDEX "AccessPassport_userId_patientId_idx" ON "AccessPassport"("userId", "patientId");

-- CreateIndex
CREATE INDEX "AccessPassport_userId_patientId_status_idx" ON "AccessPassport"("userId", "patientId", "status");

-- CreateIndex
CREATE INDEX "AccessPassport_patientId_status_idx" ON "AccessPassport"("patientId", "status");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_patientId_idx" ON "AuditLog"("patientId");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "AuditLog_outcome_idx" ON "AuditLog"("outcome");

-- CreateIndex
CREATE INDEX "AuditLog_flagged_idx" ON "AuditLog"("flagged");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_userId_createdAt_idx" ON "AuditLog"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_patientId_createdAt_idx" ON "AuditLog"("patientId", "createdAt");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoginCode" ADD CONSTRAINT "LoginCode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Patient" ADD CONSTRAINT "Patient_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Record" ADD CONSTRAINT "Record_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Record" ADD CONSTRAINT "Record_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PassportRequest" ADD CONSTRAINT "PassportRequest_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PassportRequest" ADD CONSTRAINT "PassportRequest_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PassportRequest" ADD CONSTRAINT "PassportRequest_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessPassport" ADD CONSTRAINT "AccessPassport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessPassport" ADD CONSTRAINT "AccessPassport_grantedById_fkey" FOREIGN KEY ("grantedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessPassport" ADD CONSTRAINT "AccessPassport_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessPassport" ADD CONSTRAINT "AccessPassport_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessPassport" ADD CONSTRAINT "AccessPassport_revokedById_fkey" FOREIGN KEY ("revokedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
