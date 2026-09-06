import { IndustryEditorial } from "@/components/industries/IndustryEditorial";
import { INDUSTRIES } from "@/content/industries";

export default function IndustryEnergy() {
  return <IndustryEditorial industry={INDUSTRIES[3]} />;
}