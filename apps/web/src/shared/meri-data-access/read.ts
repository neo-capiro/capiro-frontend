import {
  dataAccessMetadata,
  receiveDataAccessRequest,
  receiveDataAccessResponse,
  type DataAccessResponse,
} from "@capiro/meri-client/data-access";
import {
  readCurrentNative,
  type CurrentReadOperation,
} from "../meri-conversations/current-reads";

const text = new TextDecoder();
/** The data-access center read: a current native-auth read over Meri's membership gate; the receiver owns shape and correlation. */
export const dataAccessReadOperation: CurrentReadOperation<
  DataAccessResponse | { error: { code: string } }
> = {
  path: dataAccessMetadata.routes.read.path,
  requestBytes: dataAccessMetadata.limits.requestBytes,
  responseBytes: dataAccessMetadata.limits.responseBytes,
  admit(bytes) {
    const request = receiveDataAccessRequest(text.decode(bytes));
    return (status, body) =>
      receiveDataAccessResponse(status, text.decode(body), request);
  },
};

export function readDataAccess(
  clientId: string | null,
  signal: AbortSignal,
  isCurrent: () => boolean,
  onAccessLost: () => void,
  fetcher: typeof fetch = fetch,
) {
  return readCurrentNative<DataAccessResponse>(
    dataAccessReadOperation,
    { clientId },
    signal,
    fetcher,
    isCurrent,
    onAccessLost,
  );
}
