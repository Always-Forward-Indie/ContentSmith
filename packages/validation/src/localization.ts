import { z } from 'zod';

// Localization schemas for UE5 integration
export const LocalizationKeySchema = z.object({
  id: z.number().optional(),
  keyName: z.string().min(1).max(255),
  namespace: z.string().min(1).max(100).default('default'),
  description: z.string().nullable().optional(),
});

export const LocalizationTextSchema = z.object({
  id: z.number().optional(),
  keyId: z.number(),
  languageCode: z.string().length(2), // ISO 639-1 codes: en, ru, de, etc.
  textValue: z.string().min(1),
  isApproved: z.boolean().default(false),
});

export const CreateLocalizationKeySchema = LocalizationKeySchema.omit({ id: true });
export const UpdateLocalizationKeySchema = LocalizationKeySchema.partial().required({ id: true });

export const CreateLocalizationTextSchema = LocalizationTextSchema.omit({ id: true });
export const UpdateLocalizationTextSchema = LocalizationTextSchema.partial().required({ id: true });

// Export/Import schemas for UE5 integration
export const UE5LocalizationExportSchema = z.object({
  namespace: z.string(),
  language: z.string(),
  entries: z.record(z.string()), // key -> text mapping
});

export const UE5LocalizationImportSchema = z.object({
  namespace: z.string().default('default'),
  language: z.string(),
  entries: z.record(z.string()),
  overwriteExisting: z.boolean().default(false),
});

export type LocalizationKey = z.infer<typeof LocalizationKeySchema>;
export type LocalizationText = z.infer<typeof LocalizationTextSchema>;
export type CreateLocalizationKey = z.infer<typeof CreateLocalizationKeySchema>;
export type UpdateLocalizationKey = z.infer<typeof UpdateLocalizationKeySchema>;
export type CreateLocalizationText = z.infer<typeof CreateLocalizationTextSchema>;
export type UpdateLocalizationText = z.infer<typeof UpdateLocalizationTextSchema>;
export type UE5LocalizationExport = z.infer<typeof UE5LocalizationExportSchema>;
export type UE5LocalizationImport = z.infer<typeof UE5LocalizationImportSchema>;