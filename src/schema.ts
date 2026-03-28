import { z } from "zod";

const urlSchema = z.instanceof(URL);

/** Unix seconds as string (UFC `data-timestamp` attributes). */
const timestampSecondsSchema = z.string().min(1);

export const ufcEventSchema = z.object({
  name: z.string().min(1),
  url: urlSchema,
  date: timestampSecondsSchema,
  location: z.string(),
  fightCard: z.array(z.string()),
  mainCard: z.array(z.string()),
  prelims: z.array(z.string()),
  earlyPrelims: z.array(z.string()),
  prelimsTime: z.string().min(1).optional(),
  earlyPrelimsTime: z.string().min(1).optional(),
});

export type UFCEvent = z.infer<typeof ufcEventSchema>;
