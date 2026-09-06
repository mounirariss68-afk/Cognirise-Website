import { IndustryEditorial } from "@/components/industries/IndustryEditorial";
import { INDUSTRIES } from "@/content/industries";

export default function IndustryTelecoms() {
  return <IndustryEditorial industry={INDUSTRIES[1]} />;
}