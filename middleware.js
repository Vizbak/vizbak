import { rewrite } from '@vercel/functions';

export const config = { matcher: '/', };

export default function middleware(request) {
  const userAgent = request.headers.get('user-agent') || '';
  const isMobile = /android|iphone|ipad|ipod|mobile/i.test(userAgent);
  return rewrite(new URL(isMobile ? '/mobile-final.html' : '/desktop-final.html', request.url));
}
