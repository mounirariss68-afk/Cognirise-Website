import { PAGE_META } from "@/site/routes";

/** The browser title and description for a method page, from the site's route table. */
export function methodSeo(path: keyof typeof PAGE_META) {
  const meta = PAGE_META[path];
  return { title: meta.title, description: meta.description, noIndex: false };
}
