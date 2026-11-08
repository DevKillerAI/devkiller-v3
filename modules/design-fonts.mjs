import fs from 'node:fs/promises';
const root=new URL('../assets/fonts/',import.meta.url);
export const FONT_FAMILIES=[{id:'dmsans',family:'DM Sans',weights:'100 1000'},{id:'spacegrotesk',family:'Space Grotesk',weights:'300 700'},{id:'manrope',family:'Manrope',weights:'200 800'}];
export const FONT_CONTRACT='BUNDLED TYPOGRAPHY: optional same-origin variable fonts, no CDN or package installation: '+FONT_FAMILIES.map(f=>`${f.family} at /__devkiller/fonts/${f.id}/font.ttf (normal, weights ${f.weights})`).join('; ')+'. Choose the family that fits this product, not the same one every time. Use @font-face with font-display:swap, format("truetype"), the stated weight range and a readable fallback. Fonts and OFL licenses are included in export. System fonts remain valid when intentional.';
export async function serveDesignFont(req,res){
 const match=new URL(req.url,'http://preview').pathname.match(/^\/__devkiller\/fonts\/(dmsans|spacegrotesk|manrope)\/(font\.ttf|OFL\.txt)$/);
 if(!match)return false;
 const data=await fs.readFile(new URL(match[1]+'/'+match[2],root));
 res.writeHead(200,{'Content-Type':match[2]==='font.ttf'?'font/ttf':'text/plain; charset=utf-8','Cache-Control':'public,max-age=86400','X-Content-Type-Options':'nosniff'});res.end(req.method==='HEAD'?undefined:data);return true;
}
export async function exportDesignFonts(files){
 const text=files.map(f=>f.content||'').join('\n'),assets=[];
 for(const f of FONT_FAMILIES)if(text.includes('/__devkiller/fonts/'+f.id+'/'))for(const name of ['font.ttf','OFL.txt'])assets.push({name:'public/__devkiller/fonts/'+f.id+'/'+name,base64:(await fs.readFile(new URL(f.id+'/'+name,root))).toString('base64')});
 return assets;
}
