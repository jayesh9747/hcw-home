import { z } from 'zod';

export const createMediasoupServerSchema = z.object({
  url: z
    .string()
    .url('Invalid URL format')
    .min(1, 'URL is required')
    .max(255, 'URL cannot exceed 255 characters'),
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(50, 'Username cannot exceed 50 characters')
    .regex(
      /^[a-zA-Z0-9_-]+$/,
      'Username can only contain letters, numbers, underscores, and hyphens',
    ),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password cannot exceed 100 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
      'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
    ),
  maxNumberOfSessions: z
    .number()
    .int('Max number of sessions must be an integer')
    .min(1, 'Max number of sessions must be at least 1')
    .max(10000, 'Max number of sessions cannot exceed 10,000')
    .optional()
    .default(100),
  active: z.boolean().optional().default(true),
});

export const updateMediasoupServerSchema = createMediasoupServerSchema
  .partial()
  .omit({ password: true });

export const changeMediasoupServerPasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z
    .string()
    .min(8, 'New password must be at least 8 characters')
    .max(100, 'New password cannot exceed 100 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
      'New password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
    ),
});

export const queryMediasoupServerSchema = z.object({
  page: z.preprocess((val) => Number(val), z.number().min(1)).default(1),
  limit: z
    .preprocess((val) => Number(val), z.number().min(1).max(100))
    .default(10),
  search: z.string().optional(),
  active: z
    .preprocess((val) => val === 'true' || val === true, z.boolean())
    .optional(),
  sortBy: z
    .enum([
      'url',
      'username',
      'maxNumberOfSessions',
      'active',
      'createdAt',
      'updatedAt',
    ])
    .optional()
    .default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});
