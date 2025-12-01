import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    const accessToken = request.cookies.get('access_token')?.value;
    const path = request.nextUrl.pathname;

    // If on login page and has token, redirect to dashboard
    if (path === '/admin/login' && accessToken) {
        return NextResponse.redirect(new URL('/admin', request.url));
    }

    // If trying to access admin (not login) without token, redirect to login
    if (path.startsWith('/admin') && path !== '/admin/login' && !accessToken) {
        return NextResponse.redirect(new URL('/admin/login', request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: '/admin/:path*',
};
