export function log(event, data = {}) {
  const safe = Object.fromEntries(Object.entries(data).filter(([k]) => !/(pass|cookie|token|secret|auth|storage|header)/i.test(k)));
  console.log(JSON.stringify({ ts: new Date().toISOString(), event, ...safe }));
}
