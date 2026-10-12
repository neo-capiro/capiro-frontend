import { readConfig } from "@/shared/portfolio/config/config";
import { ProspectsIndex } from "@/features/portfolio/prospects/ProspectsIndex";
export default function Page() {
  return <ProspectsIndex destinations={readConfig(process.env).destinations} />;
}
