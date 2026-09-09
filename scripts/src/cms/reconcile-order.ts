export async function runReconciliationLifecycle<T>(input: {
  beforeIsComplete: boolean;
  initialImport: boolean;
  importInventory: () => Promise<void>;
  inspectAfterImport: () => Promise<T>;
  validateAfterImport: (after: T) => void;
  verifyInitialBaseline: () => Promise<void>;
  publishIndustryMedia: () => Promise<void>;
}): Promise<T | null> {
  if (input.beforeIsComplete) {
    await input.publishIndustryMedia();
    return null;
  }

  await input.importInventory();
  const after = await input.inspectAfterImport();
  input.validateAfterImport(after);
  if (input.initialImport) await input.verifyInitialBaseline();
  await input.publishIndustryMedia();
  return after;
}