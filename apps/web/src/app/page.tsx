import PortfolioLayout from "./(portfolio)/layout";
import PortfolioSession from "./(portfolio)/(product)/layout";
import PortfolioPage from "./(portfolio)/(product)/portfolio/page";
export const dynamic = "force-dynamic";
export default function HomePage() {
  return (
    <PortfolioLayout>
      <PortfolioSession>
        <PortfolioPage />
      </PortfolioSession>
    </PortfolioLayout>
  );
}
