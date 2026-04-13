import { Metadata } from "next";
import AdminSupportClient from "./AdminSupportClient";

export const metadata: Metadata = {
  title: "Support Admin — Change Risk Radar",
};

export default function AdminSupportPage() {
  return <AdminSupportClient />;
}
