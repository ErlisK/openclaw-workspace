import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getRiskIndex } from "@/lib/change-risk-index";
import RiskIndexClient from "./RiskIndexClient";

export const dynamic = "force-dynamic";

export async function generateMetadata(props: {
  params: Promise<{ month: string }>;
}): Promise<Metadata> {
  const { month } = await props.params;
  return {
    title: `SaaS Change Risk Index — ${month}`,
    description: `Monthly vendor risk intelligence: pricing changes, ToS updates, security scope expansions, and API deprecations across 28+ SaaS vendors.`,
  };
}

export default async function RiskIndexMonthPage(props: {
  params: Promise<{ month: string }>;
}) {
  const { month } = await props.params;

  // Validate month format
  if (!/^\d{4}-\d{2}$/.test(month)) notFound();

  const report = await getRiskIndex(month);
  if (!report) notFound();

  return <RiskIndexClient report={report} />;
}
