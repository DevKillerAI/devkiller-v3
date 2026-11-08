import fs from 'node:fs';
import {studioFiles} from './studio-fixture.mjs';
export const proFiles=studioFiles.map(f=>({...f}));
proFiles[0].content=proFiles[0].content.replace('export default function App()', 'function Studio()');
proFiles[0].content+=`
import {useRef} from 'react';
import {useForm} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {z} from 'zod';
import {clsx} from 'clsx';
import {twMerge} from 'tailwind-merge';
import {cva} from 'class-variance-authority';
const schema=z.object({quantity:z.number().int().min(1,'At least one item')});
const button=cva('rounded-xl px-5 py-3 font-semibold focus-visible:outline-2 disabled:opacity-50',{variants:{tone:{primary:'bg-orange-600 text-white'}}});
export default function App(){const lock=useRef(false);const [notice,setNotice]=useState('');const {register,handleSubmit,formState:{errors,isSubmitting}}=useForm({resolver:zodResolver(schema),defaultValues:{quantity:1}});
return <><section className="p-6 border-b border-orange-600"><h2 id="pro-title" className="text-3xl font-bold">Pro form</h2><form onSubmit={handleSubmit(async data=>{if(lock.current)return;lock.current=true;setNotice('');try{await window.DevKillerDB.set('pro-quantity',data.quantity);setNotice('Quantity saved')}catch{setNotice('Could not save quantity')}finally{lock.current=false}})}><label htmlFor="qty">Quantity</label><input id="qty" type="number" {...register('quantity',{valueAsNumber:true})} aria-invalid={!!errors.quantity} aria-describedby="qty-error"/><p id="qty-error" role="alert">{errors.quantity?.message}</p><button id="pro-save" disabled={isSubmitting} className={twMerge(clsx(button({tone:'primary'})))}>Save quantity</button><p role="status">{notice}</p></form></section><Studio/></>}
`;
proFiles[1].content='@import "tailwindcss";\n'+proFiles[1].content;

const recipe=fs.readFileSync(new URL('../knowledge/pro-v1/R02.md',import.meta.url),'utf8');const examples=[...recipe.matchAll(/```jsx\n([\s\S]*?)```/g)].map(m=>m[1]);proFiles.push({name:'src/components/ui/Button.jsx',content:examples[0]},{name:'src/components/ui/Modal.jsx',content:examples[1]});
proFiles[0].content=proFiles[0].content.replace("import {useRef}","import {Button} from './components/ui/Button.jsx';import {Modal} from './components/ui/Modal.jsx';import {useRef}").replace("const lock=useRef(false);","const [modal,setModal]=useState(false);const lock=useRef(false);").replace("return <><section","return <><Button onClick={()=>setModal(true)}>Open Pro modal</Button><Modal open={modal} onOpenChange={setModal} title='Pro modal' description='Complete themed component'><p>Ready</p></Modal><section");
