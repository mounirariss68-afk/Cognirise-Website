export type AccessDeliveryPurpose = "invitation" | "password-reset";

export class AccessDeliveryError extends Error {}

export function accessLink(token: string): string {
  const baseUrl = process.env.ADMIN_PUBLIC_URL;
  if (!baseUrl) {
    throw new AccessDeliveryError("Administrator access email delivery is not configured.");
  }
  const url = new URL("password-setup", baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`);
  url.searchParams.set("token", token);
  return url.toString();
}

export async function deliverAccessLink(input: {
  email: string;
  name: string;
  purpose: AccessDeliveryPurpose;
  token: string;
  expiresAt: Date;
}): Promise<void> {
  const endpoint = process.env.ACCESS_EMAIL_WEBHOOK_URL;
  if (!endpoint) {
    throw new AccessDeliveryError("Administrator access email delivery is not configured.");
  }
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(process.env.ACCESS_EMAIL_WEBHOOK_SECRET
        ? { authorization: `Bearer ${process.env.ACCESS_EMAIL_WEBHOOK_SECRET}` }
        : {}),
    },
    body: JSON.stringify({
      to: input.email,
      template: input.purpose,
      variables: {
        name: input.name,
        accessLink: accessLink(input.token),
        expiresAt: input.expiresAt.toISOString(),
      },
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) {
    throw new AccessDeliveryError("The secure access email could not be delivered.");
  }
}