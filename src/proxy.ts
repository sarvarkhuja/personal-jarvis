import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const USER_ID_HEADER = "x-user-id";

export async function proxy(request: NextRequest) {
	const requestHeaders = new Headers(request.headers);
	// Strip any forged value before we set our verified one
	requestHeaders.delete(USER_ID_HEADER);

	let pendingCookies: Array<{
		name: string;
		value: string;
		options: CookieOptions;
	}> = [];

	const supabase = createServerClient(
		process.env.NEXT_PUBLIC_SUPABASE_URL!,
		process.env.SUPABASE_ANON_KEY!,
		{
			cookies: {
				getAll() {
					return request.cookies.getAll();
				},
				setAll(cookiesToSet) {
					cookiesToSet.forEach(({ name, value }) =>
						request.cookies.set(name, value),
					);
					pendingCookies = cookiesToSet;
				},
			},
		},
	);

	const {
		data: { user },
	} = await supabase.auth.getUser();

	const isAuthRoute =
		request.nextUrl.pathname.startsWith("/login") ||
		request.nextUrl.pathname.startsWith("/signup");

	const applyCookies = (response: NextResponse) => {
		pendingCookies.forEach(({ name, value, options }) =>
			response.cookies.set(name, value, options),
		);
		return response;
	};

	if (!user && !isAuthRoute) {
		const url = request.nextUrl.clone();
		url.pathname = "/login";
		return applyCookies(NextResponse.redirect(url));
	}

	if (user && isAuthRoute) {
		const url = request.nextUrl.clone();
		url.pathname = "/";
		return applyCookies(NextResponse.redirect(url));
	}

	if (user) {
		requestHeaders.set(USER_ID_HEADER, user.id);
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
