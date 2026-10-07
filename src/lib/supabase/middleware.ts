import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

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

	return response;
}
