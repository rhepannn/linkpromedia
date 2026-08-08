import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import BreakingTicker from "@/components/layout/BreakingTicker";
import AnalyticsTracker from "@/components/analytics/AnalyticsTracker";
import PrivacyNotice from "@/components/layout/PrivacyNotice";
import { getCategories } from "@/lib/categories";
import { getBreakingArticles, promoteScheduledArticles } from "@/lib/articles";

export default async function PublicLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  await promoteScheduledArticles();
  const [categories, breakingArticles] = await Promise.all([
    getCategories(),
    getBreakingArticles(),
  ]);

  return (
    <>
      <AnalyticsTracker />
      <BreakingTicker articles={breakingArticles} />
      <Header categories={categories} />
      <main className="flex-1">{children}</main>
      <Footer categories={categories} />
      <PrivacyNotice />
    </>
  );
}
