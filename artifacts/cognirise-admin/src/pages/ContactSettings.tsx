import { useEffect } from "react";
import { useLocation } from "wouter";
import {
  getListDocumentsQueryKey,
  useCreateDocument,
  useGetSession,
  useListDocuments,
} from "@workspace/api-client-react";
import { CMS_CONTACT_EMAIL_DOCUMENT_SLUG } from "@workspace/api-zod";
import { Loader2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const params = {
  kind: "site-configuration" as const,
  search: CMS_CONTACT_EMAIL_DOCUMENT_SLUG,
  page: 1,
  pageSize: 20,
};

export default function ContactSettings() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { data: session } = useGetSession();
  const documents = useListDocuments(params, {
    query: { queryKey: getListDocumentsQueryKey(params) },
  });
  const createDocument = useCreateDocument();
  const existing = documents.data?.items.find(
    (document) => document.slug === CMS_CONTACT_EMAIL_DOCUMENT_SLUG,
  );

  useEffect(() => {
    if (existing) setLocation(`/content/${existing.id}`);
  }, [existing, setLocation]);

  const create = () => {
    createDocument.mutate({
      data: {
        kind: "site-configuration",
        title: "Public contact email",
        slug: CMS_CONTACT_EMAIL_DOCUMENT_SLUG,
        markets: ["uae"],
        content: {
          schemaVersion: 1,
          configuration: "contact-email",
          contactEmail: "hello@cognirise.ai",
        },
      },
    }, {
      onSuccess: (document) => setLocation(`/content/${document.id}`),
      onError: (error: any) => toast({
        title: "Contact setting could not be created",
        description: error.error || error.message,
        variant: "destructive",
      }),
    });
  };

  if (documents.isLoading || existing) {
    return <div className="flex h-full items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  if (documents.isError) {
    return <div role="alert" className="p-8 text-destructive">The contact setting could not be loaded. Try again.</div>;
  }

  return (
    <div className="mx-auto max-w-3xl p-8">
      <div className="rounded-xl border bg-card p-8 shadow-sm">
        <Mail className="mb-4 h-8 w-8 text-primary" />
        <h1 className="text-2xl font-bold">Public contact email</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          No governed contact-email setting exists yet. Create the canonical UAE draft, then use the standard review and publication controls.
        </p>
        {session?.user?.role === "viewer" ? (
          <p className="mt-6 text-sm">An editor must initialize this setting.</p>
        ) : (
          <Button className="mt-6" onClick={create} disabled={createDocument.isPending}>
            {createDocument.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create contact setting
          </Button>
        )}
      </div>
    </div>
  );
}