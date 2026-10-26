import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const USER_ID_HEADER = "x-user-id";

export async function proxy(request: NextRequest) {
	const pendingCookies = new Map<string, {
		name: string;
		value: string;
		options: CookieOptions;
	}>();

	const supabase = createServerClient(
		process.env.NEXT_PUBLIC_SUPABASE_URL!,
		process.env.SUPABASE_ANON_KEY!,
		{
			cookies: {
				getAll() {
					return request.cookies.getAll();
				},
				setAll(cookiesToSet) {
					cookiesToSet.forEach((cookie) => {
						request.cookies.set(cookie.name, cookie.value);
						pendingCookies.set(cookie.name, cookie);
					});
				},
			},
		},
	);

	// Verifies the access token locally with cached public keys when possible.
	// The SDK still validates legacy symmetric tokens through the Auth server
	// and refreshes expiring sessions; never trust an unverified cookie user.
	const { data, error } = await supabase.auth.getClaims();
	const userId = !error && typeof data?.claims.sub === "string"
		? data.claims.sub
		: null;

	const isAuthRoute =
		request.nextUrl.pathname.startsWith("/login") ||
		request.nextUrl.pathname.startsWith("/signup");

	const applyCookies = (response: NextResponse) => {
		pendingCookies.forEach(({ name, value, options }) =>
			response.cookies.set(name, value, options),
		);
		return response;
	};

	if (!userId && !isAuthRoute) {
		const url = request.nextUrl.clone();
		url.pathname = "/login";
		return applyCookies(NextResponse.redirect(url));
	}

	if (userId && isAuthRoute) {
		const url = request.nextUrl.clone();
		url.pathname = "/";
		return applyCookies(NextResponse.redirect(url));
	}

	// Clone after getClaims, which may refresh the request's Cookie header.
	const requestHeaders = new Headers(request.headers);
	// Strip any forged value before we set our verified one.
	requestHeaders.delete(USER_ID_HEADER);
	if (userId) {
		requestHeaders.set(USER_ID_HEADER, userId);
	}

	return applyCookies(
		NextResponse.next({ request: { headers: requestHeaders } }),
	);
}

export const config = {
	matcher: [
		"/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff|woff2|ttf|otf)$).*)",
	],
};
