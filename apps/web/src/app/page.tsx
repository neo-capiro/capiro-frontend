import { MeriFixtureEntry } from '../features/meri/MeriFixtureEntry';
import { redirect } from 'next/navigation';

// The shared app keeps its default entry; the isolated Portfolio image selects its own home.
export const dynamic = 'force-dynamic';

export default function HomePage() {
  if (process.env.CAPIRO_DEFAULT_PRODUCT === 'portfolio') redirect('/portfolio');
  return <MeriFixtureEntry />;
}
