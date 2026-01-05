
import { z } from 'zod';
import { insertCallSchema, calls } from './schema';

export const api = {
  calls: {
    create: {
      method: 'POST' as const,
      path: '/api/calls',
      input: z.object({}), 
      responses: {
        201: z.custom<typeof calls.$inferSelect>(),
      },
    },
    end: {
      method: 'POST' as const,
      path: '/api/calls/:id/end',
      input: z.object({
        duration: z.number(),
        transcript: z.string().optional(),
      }),
      responses: {
        200: z.custom<typeof calls.$inferSelect>(),
      },
    },
  },
  chat: {
    post: {
      method: 'POST' as const,
      path: '/api/chat',
      input: z.object({
        message: z.string(),
      }),
      responses: {
        200: z.object({
          response: z.string(),
        }),
      },
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
