import path from 'node:path';

export function validateFiles(files,{requireIndex=true,extensions=['.html','.css','.js','.json','.txt','.svg'],maxBytes=2*1024*1024,maxFiles=80,namePattern=/^[a-zA-Z0-9_./ -]+$/}={}) {
  if (!Array.isArray(files) || !files.length || files.length > maxFiles) throw new Error(`Submit between 1 and ${maxFiles} files.`);
  const seen = new Set();
  let bytes = 0;
  for (const file of files) {
    const name = file?.name;
    if (typeof name !== 'string' || name.length > 180 || !namePattern.test(name) || name.startsWith('/') || name.split('/').some(p => !p || p === '..' || p === '.') || !extensions.includes(path.posix.extname(name).toLowerCase())) throw new Error('Invalid file name or format. Use supported files with paths inside the project folder.');
    if (seen.has(name.toLowerCase())) throw new Error('Some files have duplicate names.');
    if (typeof file.content !== 'string') throw new Error('File contents must be text.');
    seen.add(name.toLowerCase());
    bytes += Buffer.byteLength(file.content);
  }
  if (requireIndex&&!files.some(f => f.name === 'index.html')) throw new Error('Include index.html in the root folder.');
  if (bytes > maxBytes) throw new Error(`The package must be no larger than ${maxBytes/(1024*1024)} MB.`);
  return files;
}
