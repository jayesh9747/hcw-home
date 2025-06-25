// src/terms/dto/terms.schema.ts
import { z } from 'zod';

export const CreateTermSchema = z.object({
  language: z
    .string({
      required_error: 'Language is required.',
      invalid_type_error: 'Language must be a string.',
    })
    .min(2, { message: 'Language must be at least 2 characters long.' }),

  country: z
    .string({
      required_error: 'Country is required.',
      invalid_type_error: 'Country must be a string.',
    })
    .min(2, { message: 'Country must be at least 2 characters long.' }),

  content: z
    .string({
      required_error: 'Content is required.',
      invalid_type_error: 'Content must be a string.',
    })
    .min(10, { message: 'Content must be at least 10 characters long.' }),
});

