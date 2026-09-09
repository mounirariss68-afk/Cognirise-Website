import type { OfficeContent } from "@workspace/api-zod";

type OfficeContactCardProps = Pick<OfficeContent, "city" | "address" | "phone">;

export function OfficeContactCard({ city, address, phone }: OfficeContactCardProps) {
  return (
    <div>
      <h4 className="font-bold mb-2">{city}</h4>
      <p className="max-w-[32rem] text-sm leading-6 text-muted-foreground">{address}</p>
      {phone ? (
        <a href={`tel:${phone}`} className="mt-2 inline-block text-sm text-[hsl(var(--brand-coral))] hover:underline">
          {phone}
        </a>
      ) : null}
    </div>
  );
}