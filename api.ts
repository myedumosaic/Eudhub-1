import { getCurrentUser, type CurrentUser } from "@/lib/auth";

type Ctx = { params: Promise<Record<string, string>> };

export function withAuth(
  handler: (user: CurrentUser, req: Request, ctx: Ctx) => Promise<Response>,
) {
  return async (req: Request, ctx: Ctx): Promise<Response> => {
    const user = await getCurrentUser();
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    try {
      return await handler(user, req, ctx);
    } catch (err) {
      console.error(err);
      return Response.json({ error: "Server error" }, { status: 500 });
    }
  };
}
