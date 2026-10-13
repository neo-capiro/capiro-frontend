import { auth } from "@clerk/nextjs/server";
import { readCapiroConfig } from "../../../../shared/capiro/config";
import {
  handleCapiroRequest,
  handlePublicPlannerFormRequest,
} from "../../../../shared/capiro/gateway";
import { capiroOperations } from "../../../../shared/capiro/registry";

type Context = { params: Promise<{ operation: string }> };
async function handle(request: Request, context: Context) {
  const { operation } = await context.params;
  if (operation.startsWith("public-form."))
    return handlePublicPlannerFormRequest(
      request,
      operation,
      readCapiroConfig(process.env),
    );
  return handleCapiroRequest(
    request,
    operation,
    capiroOperations,
    readCapiroConfig(process.env),
    async () => {
      const session = await auth();
      return session.userId ? session.getToken({ template: "capiro" }) : null;
    },
  );
}
export {
  handle as GET,
  handle as POST,
  handle as PUT,
  handle as PATCH,
  handle as DELETE,
};
