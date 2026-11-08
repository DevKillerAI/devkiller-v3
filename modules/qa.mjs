export async function inspectPreview(port) {
  const started = Date.now();
  let evidence = 'Sem resposta HTTP.';
  while (Date.now() - started < 10000) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/`, {signal:AbortSignal.timeout(1500)});
      const html = await response.text();
      evidence = `GET / → HTTP ${response.status}; ${Buffer.byteLength(html)} bytes recebidos.`;
      if (response.ok && html.trim()) return {category:'ambiente', status:'passed', requirement:'Serve the home page.', expected:'HTTP 200 and a non-empty document.', evidence};
    } catch (error) { evidence = error.message; }
    await new Promise(resolve => setTimeout(resolve, 300));
  }
  return {category:'ambiente', status:'failed', requirement:'Serve the home page.', expected:'HTTP 200 and a non-empty document within 10 seconds.', evidence};
}
