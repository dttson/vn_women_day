import { z } from 'zod';

const familyPhotoSchema=z.object({
  src:z.string().startsWith('/'),label:z.string(),
  focus:z.tuple([z.number().min(0).max(100),z.number().min(0).max(100)]),
  zoom:z.number().min(1).max(3),
});

export const configSchema = z.object({
  configVersion: z.literal(1), title: z.string().min(1), subtitle: z.string().min(1),
  occasion: z.string(), sender: z.string(),
  audio:z.object({
    musicVolume:z.number().min(0).max(1),
    clickVolume:z.number().min(0).max(1),
    bloomVolume:z.number().min(0).max(1),
    pageVolume:z.number().min(0).max(1),
  }).default({musicVolume:.18,clickVolume:.14,bloomVolume:.35,pageVolume:.22}),
  watering: z.object({
    durationMs: z.number().int().min(1000).max(60000),
    absorptionMs: z.number().int().min(1000),
    firstBloomWaterings: z.number().int().min(1).max(100),
    dailyCooldownMs: z.number().int().min(1000),
    seasonWaterings: z.number().int().min(1).max(100),
  }),
  visual: z.object({
    modelUrl: z.string().startsWith('/'), fallbackUrl: z.string().startsWith('/'),
    background: z.string().regex(/^#[0-9a-f]{6}$/i),
    pixelRatioCap: z.number().min(1).max(2), swayAmount: z.number().min(0).max(.1),
    dustCount: z.number().int().min(0).max(100),
  }),
  messages: z.array(z.object({id: z.string().min(1), afterWaterings: z.number().int().min(0), label: z.string(), text: z.string()})).min(1),
  familyPhotos:z.object({
    mom:familyPhotoSchema.optional(),
    bisu:familyPhotoSchema.optional(),
    ryo:familyPhotoSchema.optional(),
  }).default({}),
  photoMemories:z.array(z.object({
    id:z.string().min(1),src:z.string().startsWith('/'),thumbnail:z.string().startsWith('/').optional(),
    caption:z.string().min(1),alt:z.string().min(1),
  })).default([]),
  albumAnimation:z.object({
    lidOpenMs:z.number().int().min(0).max(3000),
    spreadMs:z.number().int().min(0).max(3000),
    gatherMs:z.number().int().min(0).max(3000),
    lidCloseMs:z.number().int().min(0).max(3000),
  }).default({lidOpenMs:400,spreadMs:680,gatherMs:500,lidCloseMs:320}),
  growth: z.object({
    flowerNames:z.tuple([z.string().min(1),z.string().min(1),z.string().min(1)]),
    keepsakes:z.array(z.object({id:z.string().min(1),title:z.string().min(1),text:z.string().min(1),imageUrl:z.string().startsWith('/').optional()})).min(1),
  }).default({flowerNames:['Ba','Bạn nhỏ thứ nhất','Bạn nhỏ thứ hai'],keepsakes:[{id:'together',title:'Cả nhà ở bên mẹ',text:'Ba và hai con thương mẹ, hôm nay và những ngày sau nữa.'}]}),
  letter: z.object({title: z.string(), paragraphs: z.array(z.string()).min(1), signature: z.string()}),
}).superRefine((c, ctx) => {
  if (new Set(c.messages.map(m => m.id)).size !== c.messages.length) ctx.addIssue({code:'custom', message:'Message IDs must be unique'});
  if (!c.messages.some(m => m.afterWaterings === 0)) ctx.addIssue({code:'custom', message:'A welcome message is required'});
  if(new Set(c.growth.keepsakes.map(m=>m.id)).size!==c.growth.keepsakes.length)ctx.addIssue({code:'custom',message:'Keepsake IDs must be unique'});
  if(new Set(c.photoMemories.map(m=>m.id)).size!==c.photoMemories.length)ctx.addIssue({code:'custom',message:'Photo memory IDs must be unique'});
});
export type AppConfig = z.infer<typeof configSchema>;
export async function loadConfig(): Promise<AppConfig> {
  const response = await fetch('/config/settings.json', {cache:'no-cache'});
  if (!response.ok) throw new Error('Không tải được lời nhắn của ba. Mẹ thử tải lại nhé.');
  const config = configSchema.parse(await response.json());
  config.messages.sort((a,b) => a.afterWaterings-b.afterWaterings);
  return config;
}
