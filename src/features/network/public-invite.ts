/** Non produrre mai un invito localhost, LAN o file://. */
export function publicInviteBase(value:string):string {
  try {
    const url=new URL(value),host=url.hostname.toLowerCase();
    if(url.protocol!=='https:'||!host.includes('.')||host.endsWith('.localhost')||host.endsWith('.local')||/^[\d.]+$/.test(host)||host.includes(':'))return '';
    return url.origin;
  }catch{return '';}
}
export function cloudflareOrigin(value:string):string {
  const origin=publicInviteBase(value);
  return origin&&new URL(origin).hostname.endsWith('.trycloudflare.com')?origin:'';
}
