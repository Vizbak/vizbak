import { rewrite } from '@vercel/functions';

export const config = {
  matcher: '/',
};

export default function middleware(request) {
  const userAgent = request.headers.get('user-agent') || '';
  const isMobile = /android|iphone|ipad|ipod|mobile/i.test(userAgent);

  return rewrite(
    new URL(isMobile ? '/mobile.html' : '/api/desktop', request.url)
  );
}
