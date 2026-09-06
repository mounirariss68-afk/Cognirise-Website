import { randomUUID } from "node:crypto";
import { Storage } from "@google-cloud/storage";

const sidecar = "http://127.0.0.1:1106";
export const objectStorageClient = new Storage({
  credentials: {
    audience: "replit", subject_token_type: "access_token", token_url: `${sidecar}/token`, type: "external_account",
    credential_source: { url: `${sidecar}/credential`, format: { type: "json", subject_token_field_name: "access_token" } },
    universe_domain: "googleapis.com",
  },
  projectId: "",
});

function privateDirectory(): string {
  const value = process.env.PRIVATE_OBJECT_DIR?.replace(/\/+$/, "");
  if (!value || !/^\/[^/]+\/.+/.test(value)) throw new Error("PRIVATE_OBJECT_DIR is not configured");
  return value;
}
function splitPath(path: string): { bucketName: string; objectName: string } {
  const parts = path.replace(/^\//, "").split("/");
  if (parts.length < 2 || parts.some((part) => !part || part === "." || part === "..")) throw new Error("Invalid object path");
  return { bucketName: parts[0]!, objectName: parts.slice(1).join("/") };
}

export class CmsObjectStorage {
  createPendingPath(mediaId: string): string {
    return `${privateDirectory()}/cms-media/${mediaId}/${randomUUID()}`;
  }

  async signPut(objectPath: string): Promise<string> {
    const { bucketName, objectName } = splitPath(objectPath);
    const response = await fetch(`${sidecar}/object-storage/signed-object-url`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bucket_name: bucketName, object_name: objectName, method: "PUT", expires_at: new Date(Date.now() + 15 * 60_000).toISOString() }),
      signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok) throw new Error(`Unable to sign upload URL (${response.status})`);
    const data = await response.json() as { signed_url?: unknown };
    if (typeof data.signed_url !== "string") throw new Error("Storage signer returned an invalid URL");
    return data.signed_url;
  }

  async fileMetadata(objectPath: string): Promise<{ contentType?: string; size?: string; md5Hash?: string; metadata?: Record<string, string> } | undefined> {
    if (!objectPath.startsWith(`${privateDirectory()}/cms-media/`)) return undefined;
    const { bucketName, objectName } = splitPath(objectPath);
    const file = objectStorageClient.bucket(bucketName).file(objectName);
    const [exists] = await file.exists();
    if (!exists) return undefined;
    const [metadata] = await file.getMetadata();
    return metadata as { contentType?: string; size?: string; md5Hash?: string; metadata?: Record<string, string> };
  }

  file(objectPath: string) {
    if (!objectPath.startsWith(`${privateDirectory()}/cms-media/`)) throw new Error("Invalid CMS media path");
    const { bucketName, objectName } = splitPath(objectPath);
    return objectStorageClient.bucket(bucketName).file(objectName);
  }
}