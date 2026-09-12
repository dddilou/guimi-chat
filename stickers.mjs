import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const folder = new URL('./public/assets/stickers/', import.meta.url);
export const validSticker = value => typeof value==='string' && /^\/assets\/stickers\/[a-f0-9]{64}\.(gif|png|jpg|webp)$/.test(value);
export async function listStickers() {
  await mkdir(folder,{recursive:true});
  const names=await readdir(folder);
  const items=await Promise.all(names.filter(n=>/^[a-f0-9]{64}\.json$/.test(n)).map(async n=>{
    try {const item=JSON.parse(await readFile(new URL(n,folder),'utf8'));return validSticker(item.url)?item:null;}catch{return null;}
  }));
  return items.filter(Boolean).sort((a,b)=>a.createdAt.localeCompare(b.createdAt));
}
export async function addSticker(input) {
  if(typeof input.name!=='string'||!input.name.trim()||input.name.length>100) throw Error('表情名称需要 1～100 个字。');
  if(typeof input.data!=='string'||input.data.length>8*1024*1024) throw Error('每张表情包最多 6 MB。');
  const match=input.data.match(/^data:image\/(?:gif|png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$/);
  if(!match) throw Error('请选择 GIF、PNG、JPG 或 WebP 图片。');
  const bytes=Buffer.from(match[1],'base64');
  const ext=bytes.subarray(0,6).toString().match(/^GIF8[79]a$/)?'gif':bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))?'png':bytes[0]===255&&bytes[1]===216&&bytes[2]===255?'jpg':bytes.subarray(0,4).toString()==='RIFF'&&bytes.subarray(8,12).toString()==='WEBP'?'webp':null;
  if(!ext) throw Error('这不是可读取的图片，请从微信另存为原始图片。');
  const id=createHash('sha256').update(bytes).digest('hex');
  await mkdir(folder,{recursive:true});
  try {return JSON.parse(await readFile(new URL(`${id}.json`,folder),'utf8'));} catch{}
  const item={id,url:`/assets/stickers/${id}.${ext}`,name:input.name.trim(),createdAt:new Date().toISOString()};
  await writeFile(new URL(`${id}.${ext}`,folder),bytes);
  await writeFile(new URL(`${id}.json`,folder),JSON.stringify(item));
  return item;
}
