import { IndustryEditorial } from "@/components/industries/IndustryEditorial";
import { INDUSTRIES } from "@/content/industries";

export default function IndustryTravel() {
  return <IndustryEditorial industry={INDUSTRIES[2]} />;
}