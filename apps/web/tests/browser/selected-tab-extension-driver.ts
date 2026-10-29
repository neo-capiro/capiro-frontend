import { expect, type CDPSession } from "@playwright/test";

/** Native toolbar popups are not ordinary Playwright pages. Debug protocol is
 * used only by this test driver; the extension requests no debugger permission. */
export async function openExtensionPopup(
  cdp: CDPSession,
  extensionId: string,
  targetId: string,
) {
  await cdp.send("Extensions.triggerAction", { id: extensionId, targetId });
  let popupId: string | undefined;
  await expect
    .poll(async () => {
      const targets = await cdp.send("Target.getTargets", { filter: [{}] });
      popupId = targets.targetInfos.find(
        (target) =>
          target.type === "page" &&
          target.url === `chrome-extension://${extensionId}/popup.html`,
      )?.targetId;
      return popupId;
    })
    .toBeTruthy();
  const { sessionId } = await cdp.send("Target.attachToTarget", {
    targetId: popupId!,
    flatten: false,
  });
  let serial = 0;
  return {
    async evaluate<T>(expression: string): Promise<T> {
      const id = ++serial;
      return new Promise<T>((resolve, reject) => {
        const cleanup = () => {
          clearTimeout(timer);
          cdp.off("Target.receivedMessageFromTarget", receive);
        };
        const timer = setTimeout(() => {
          cleanup();
          reject(Error("Native popup response timed out"));
        }, 5000);
        const receive = (packet: { sessionId: string; message: string }) => {
          if (packet.sessionId !== sessionId) return;
          const message = JSON.parse(packet.message);
          if (message.id !== id) return;
          cleanup();
          if (message.error || message.result?.exceptionDetails)
            reject(Error("Native popup evaluation failed"));
          else resolve(message.result.result.value as T);
        };
        cdp.on("Target.receivedMessageFromTarget", receive);
        void cdp
          .send("Target.sendMessageToTarget", {
            sessionId,
            message: JSON.stringify({
              id,
              method: "Runtime.evaluate",
              params: {
                expression,
                returnByValue: true,
                awaitPromise: true,
                userGesture: true,
              },
            }),
          })
          .catch((error) => {
            cleanup();
            reject(error);
          });
      });
    },
  };
}
