import { auth } from "@clerk/nextjs/server";
import { readDocumentConfig } from "../../../../shared/meri-documents/config";
import { proxyDocumentRequest } from "../../../../shared/meri-documents/proxy";

export async function POST(
  request: Request,
  context: { params: Promise<{ operation: string }> },
) {
  const { operation } = await context.params;
  return proxyDocumentRequest(
    request,
    operation,
    readDocumentConfig(process.env),
    async () => {
      const session = await auth();
      return session.userId ? session.getToken({ template: "capiro" }) : null;
    },
  );
}
