import { z } from 'zod';

export const loginSchema = z.object({
  email: z
  .string()
  .email('Invalid email format')
  .max(255, 'Email cannot exceed 255 characters'),
  
  password: z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(100, 'Password cannot exceed 100 characters')
  .regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
    'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
  ),});

