import { IndustryEditorial } from "@/components/industries/IndustryEditorial";
import { INDUSTRIES } from "@/content/industries";

export default function IndustryBanking() {
  return <IndustryEditorial industry={INDUSTRIES[0]} />;
}