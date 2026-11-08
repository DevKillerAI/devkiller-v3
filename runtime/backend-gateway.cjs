const http=require('node:http');
http.createServer((req,res)=>{
 const upstream=http.request({hostname:process.env.BACKEND_HOST,port:8080,path:req.url,method:req.method,headers:req.headers},r=>{res.writeHead(r.statusCode,r.headers);r.pipe(res)});
 upstream.setTimeout(15000,()=>upstream.destroy());
 upstream.on('error',()=>{if(!res.headersSent)res.writeHead(503);res.end('Application server is starting or unavailable.');});req.pipe(upstream);
}).listen(8080,'0.0.0.0');
setTimeout(()=>process.exit(0),30*60*1000).unref();
