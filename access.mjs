export function acceptsOrigin(headers, publicOrigin='') {
  try {
    const source=new URL(headers.origin);
    if(!['http:','https:'].includes(source.protocol)||source.origin!==headers.origin)return false;
    if(publicOrigin)return source.origin===new URL(publicOrigin).origin;
    return source.host===headers.host;
  }catch{return false;}
}
export function isLocalAdmin(req) {
  const address=req.socket.remoteAddress;
  return ['127.0.0.1','::1','::ffff:127.0.0.1'].includes(address)
    && /^(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/.test(req.headers.host||'');
}
