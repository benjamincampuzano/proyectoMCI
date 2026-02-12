-- AlterTable
ALTER TABLE "UserProfile" ADD COLUMN     "dataPolicyAccepted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "dataTreatmentAuthorized" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "minorConsentAuthorized" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Guest" ADD COLUMN     "dataPolicyAccepted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "dataTreatmentAuthorized" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "minorConsentAuthorized" BOOLEAN NOT NULL DEFAULT false;
