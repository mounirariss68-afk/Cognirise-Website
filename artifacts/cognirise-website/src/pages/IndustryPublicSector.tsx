import { IndustryEditorial } from "@/components/industries/IndustryEditorial";
import { INDUSTRIES } from "@/content/industries";

export default function IndustryPublicSector() {
  return <IndustryEditorial industry={INDUSTRIES[4]} />;
}