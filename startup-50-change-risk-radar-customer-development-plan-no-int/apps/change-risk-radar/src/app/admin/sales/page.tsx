import type { Metadata } from "next";
import AdminSalesClient from "./AdminSalesClient";

export const metadata: Metadata = {
  title: "Sales Playbook — Admin · Change Risk Radar",
};

export default function AdminSalesPage() {
  return <AdminSalesClient />;
}
