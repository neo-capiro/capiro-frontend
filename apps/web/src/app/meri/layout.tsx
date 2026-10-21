import { MeriCapabilitiesProvider } from "../../shared/meri-resources/CapabilityContext";
import { readMeriCapabilities } from "../../shared/meri-resources/capabilities.server";

export default function MeriLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <MeriCapabilitiesProvider value={readMeriCapabilities(process.env)}>
      {children}
    </MeriCapabilitiesProvider>
  );
}
