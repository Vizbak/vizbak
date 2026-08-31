export const config = { matcher: '/', };

export default async function middleware(request) {
  const userAgent = request.headers.get('user-agent') || '';
  const isMobile = /android|iphone|ipad|ipod|mobile/i.test(userAgent);
  const target = new URL(isMobile ? '/mobile-final.html' : '/desktop-final.html', request.url);

  try {
    const origin = await fetch(target, { headers: request.headers });
    const html = await origin.text();
    const enhanced = html.replace('</body>', '<script src="/assets/neural-enhance.js?v=2"></script></body>');
    const headers = new Headers(origin.headers);
    headers.delete('content-length');
    headers.delete('content-encoding');
    headers.set('content-type', 'text/html; charset=utf-8');
    return new Response(enhanced, { status: origin.status, headers });
  } catch (error) {
    return Response.redirect(target, 307);
  }
}
