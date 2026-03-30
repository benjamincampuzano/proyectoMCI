-- CreateTable
CREATE TABLE "KidsClassPhoto" (
    "id" SERIAL NOT NULL,
    "studentId" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "description" TEXT,
    "uploadedBy" INTEGER NOT NULL,
    "uploadDate" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "KidsClassPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "KidsClassPhoto_studentId_idx" ON "KidsClassPhoto"("studentId");

-- CreateIndex
CREATE INDEX "KidsClassPhoto_uploadedBy_idx" ON "KidsClassPhoto"("uploadedBy");

-- CreateIndex
CREATE INDEX "KidsClassPhoto_uploadDate_idx" ON "KidsClassPhoto"("uploadDate");

-- AddForeignKey
ALTER TABLE "KidsClassPhoto" ADD CONSTRAINT "KidsClassPhoto_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KidsClassPhoto" ADD CONSTRAINT "KidsClassPhoto_uploadedBy_fkey" FOREIGN KEY ("uploadedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
