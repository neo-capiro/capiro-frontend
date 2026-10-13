import { auth } from "@clerk/nextjs/server";
import { readActionConfig } from "../../../../shared/meri-actions/config";
import { proxyActionRequest } from "../../../../shared/meri-actions/proxy";

export async function POST(
  request: Request,
  context: { params: Promise<{ operation: string }> },
) {
  const { operation } = await context.params;
  return proxyActionRequest(
    request,
    operation,
    readActionConfig(process.env),
    async () => {
      const session = await auth();
      return session.userId ? session.getToken({ template: "capiro" }) : null;
    },
  );
}
