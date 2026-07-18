import { NextRequest, NextResponse } from "next/server";

/**
 * Wraps an API route handler with try/catch, timing, and consistent error responses.
 *
 * Usage (wrap individual handlers):
 *   export const GET = apiHandler(async (req) => {
 *     const data = await fetchData();
 *     return NextResponse.json({ success: true, data });
 *   });
 *
 * Or wrap multiple handlers at once:
 *   const handlers = apiHandlers({
 *     GET: async (req) => { ... },
 *     POST: async (req) => { ... },
 *   });
 *   export const { GET, POST } = handlers;
 */

type Handler = (req: NextRequest, ctx?: any) => Promise<Response>;

export function apiHandler(handler: Handler): Handler {
  return async (req: NextRequest, ctx?: any) => {
    const start = Date.now();
    const method = req.method;
    const path = req.nextUrl.pathname;

    try {
      const response = await handler(req, ctx);
      const duration = Date.now() - start;

      if (duration > 3000) {
        console.warn(`⚠️ Slow API: ${method} ${path} took ${duration}ms`);
      }

      return response;
    } catch (error: any) {
      const duration = Date.now() - start;
      console.error(`❌ API Error: ${method} ${path} (${duration}ms)`, error?.message || error);

      return NextResponse.json(
        {
          success: false,
          error: process.env.NODE_ENV === "development"
            ? error?.message || "Internal server error"
            : "Internal server error",
        },
        { status: 500 }
      );
    }
  };
}

type HandlerMap = Record<string, Handler>;

export function apiHandlers<T extends HandlerMap>(handlers: T): T {
  const wrapped = {} as any;
  for (const [method, handler] of Object.entries(handlers)) {
    wrapped[method] = apiHandler(handler);
  }
  return wrapped;
}
