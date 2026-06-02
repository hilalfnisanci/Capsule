-- Migration: 20260602_init
-- Initial schema for the Capsule data model

-- Enums
CREATE TYPE "CapsuleStatus" AS ENUM ('LOCKED', 'OPENED');
CREATE TYPE "CapsuleVisibility" AS ENUM ('PRIVATE', 'SHARED', 'PUBLIC');
CREATE TYPE "MediaType" AS ENUM ('IMAGE', 'AUDIO', 'VIDEO', 'DOCUMENT');

-- Capsule table
CREATE TABLE "Capsule" (
    "id"          TEXT                NOT NULL,
    "title"       TEXT                NOT NULL,
    "description" TEXT,
    "userId"      TEXT                NOT NULL,
    "status"      "CapsuleStatus"     NOT NULL DEFAULT 'LOCKED',
    "visibility"  "CapsuleVisibility" NOT NULL DEFAULT 'PRIVATE',
    "openDate"    TIMESTAMP(3)        NOT NULL,
    "openedAt"    TIMESTAMP(3),
    "createdAt"   TIMESTAMP(3)        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3)        NOT NULL,

    CONSTRAINT "Capsule_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Capsule_userId_idx"   ON "Capsule"("userId");
CREATE INDEX "Capsule_openDate_idx" ON "Capsule"("openDate");
CREATE INDEX "Capsule_status_idx"   ON "Capsule"("status");

-- CapsuleMedia table — metadata stub ready for future media upload support
CREATE TABLE "CapsuleMedia" (
    "id"        TEXT         NOT NULL,
    "capsuleId" TEXT         NOT NULL,
    "type"      "MediaType"  NOT NULL,
    "url"       TEXT         NOT NULL,
    "filename"  TEXT         NOT NULL,
    "mimeType"  TEXT         NOT NULL,
    "sizeBytes" INTEGER      NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CapsuleMedia_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CapsuleMedia_capsuleId_idx" ON "CapsuleMedia"("capsuleId");

ALTER TABLE "CapsuleMedia"
    ADD CONSTRAINT "CapsuleMedia_capsuleId_fkey"
    FOREIGN KEY ("capsuleId")
    REFERENCES "Capsule"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- CapsuleShare table — junction table granting per-user read access
CREATE TABLE "CapsuleShare" (
    "id"        TEXT         NOT NULL,
    "capsuleId" TEXT         NOT NULL,
    "userId"    TEXT         NOT NULL,
    "invitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CapsuleShare_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CapsuleShare_capsuleId_userId_key" ON "CapsuleShare"("capsuleId", "userId");
CREATE INDEX "CapsuleShare_userId_idx" ON "CapsuleShare"("userId");

ALTER TABLE "CapsuleShare"
    ADD CONSTRAINT "CapsuleShare_capsuleId_fkey"
    FOREIGN KEY ("capsuleId")
    REFERENCES "Capsule"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
