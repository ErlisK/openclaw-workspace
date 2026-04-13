import { Metadata } from "next";
import PartnerPortalClient from "./PartnerPortalClient";

export const metadata: Metadata = {
  title: "Partner Portal — Change Risk Radar",
};

export const dynamic = "force-dynamic";

export default async function PartnerPortalPage(props: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await props.searchParams;

  return <PartnerPortalClient token={token ?? ""} />;
}
