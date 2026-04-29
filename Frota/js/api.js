export const GAS_URL = "php/api.php";
export const apiKeyORS = "eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6IjJjNjRkOTdmMzRjOTRlYzQ5ZWUwZTQxYTMzZGU2Y2E0IiwiaCI6Im11cm11cjY0In0=";

export async function gasGET(params) {
  const url = new URL(GAS_URL, window.location.href);
  for (const [k, v] of Object.entries(params)) url.searchParams.append(k, v);
  // ✅ Cache-bust: o GAS cacheia respostas GET por padrão.
  // Sem isso, após um POST (ex: confirmar retorno), o próximo GET
  // ainda devolve o estado antigo (ex: Retornando) em vez do novo (Finalizado).
  url.searchParams.append('_t', Date.now());
  const res = await fetch(url.toString(), { redirect: 'follow' });
  const text = await res.text();
  try { return JSON.parse(text); }
  catch (e) { throw new Error('Resposta não é JSON. HTTP ' + res.status); }
}

export async function gasPOST(payload) {
  const res = await fetch(GAS_URL, {
    method: 'POST',
    redirect: 'follow',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(payload)
  });
  const text = await res.text();
  try { return JSON.parse(text); }
  catch (e) { throw new Error('Resposta não é JSON. HTTP ' + res.status); }
}