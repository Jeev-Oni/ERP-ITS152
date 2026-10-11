import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { canAccess, isGuardedPath } from "@/lib/access";

export async function updateSession(request: NextRequest) {
	let response = NextResponse.next({ request });

	const supabase = createServerClient(
		process.env.NEXT_PUBLIC_SUPABASE_URL!,
		process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
		{
			cookies: {
				getAll() {
					return request.cookies.getAll();
				},
				setAll(
					cookiesToSet: {
						name: string;
						value: string;
						options: CookieOptions;
					}[],
				) {
					cookiesToSet.forEach(({ name, value }) =>
						request.cookies.set(name, value),
					);
					response = NextResponse.next({ request });
					cookiesToSet.forEach(({ name, value, options }) =>
						response.cookies.set(name, value, options),
					);
				},
			},
		},
	);

	// Refreshes the session if expired — required for Server Components.
	const {
		data: { user },
	} = await supabase.auth.getUser();

	// Pages that must work without a session: sign-in, the forgot-password request, the
	// email-link callbacks, and /reset-password (which explains an expired link itself
	// instead of bouncing to /login).
	const publicPaths = ["/login", "/forgot-password", "/reset-password", "/auth/"];
	const isPublic = publicPaths.some((p) => request.nextUrl.pathname.startsWith(p));

	// Redirect unauthenticated users to /login, except for those pages.
	if (!user && !isPublic) {
		const url = request.nextUrl.clone();
		url.pathname = "/login";
		return NextResponse.redirect(url);
	}

	// Role gate: a signed-in user who opens a module their role doesn't manage (typed URL,
	// old bookmark) is sent back to the dashboard. The sidebar already hides these links;
	// this is what makes hiding them more than cosmetic. One small query, and only on module
	// pages, never on "/" or static files. (RLS still protects the data either way.)
	if (user && isGuardedPath(request.nextUrl.pathname)) {
		const { data: profile } = await supabase
			.from("profiles")
			.select("role")
			.eq("id", user.id)
			.single();

		if (!canAccess(profile?.role, request.nextUrl.pathname)) {
			const url = request.nextUrl.clone();
			url.pathname = "/";
			url.search = "?notice=no-access";
			const redirect = NextResponse.redirect(url);
			// Carry over any session cookies that were just refreshed above.
			response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
			return redirect;
		}
	}

	return response;
}
