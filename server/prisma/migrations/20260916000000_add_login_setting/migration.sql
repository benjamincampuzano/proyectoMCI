-- CreateTable
CREATE TABLE "LoginSetting" (
    "id" SERIAL NOT NULL,
    "mediaType" TEXT NOT NULL DEFAULT 'IMAGE',
    "mediaUrl" TEXT NOT NULL,
    "welcomeTitle" TEXT,
    "welcomeSubtitle" TEXT,
    "updatedBy" INTEGER,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "LoginSetting_pkey" PRIMARY KEY ("id")
);