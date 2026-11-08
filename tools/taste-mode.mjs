import fs from 'node:fs/promises';
import {validateTasteMode} from '../modules/taste.mjs';
const mode=validateTasteMode(process.argv[2]);
await fs.writeFile(new URL('../settings/taste.json',import.meta.url),JSON.stringify({mode},null,2)+'\n');
console.log(`Taste mode saved: ${mode}. Restart idle Engine/MVP worker processes to apply. Existing jobs retain their recorded mode.`);
