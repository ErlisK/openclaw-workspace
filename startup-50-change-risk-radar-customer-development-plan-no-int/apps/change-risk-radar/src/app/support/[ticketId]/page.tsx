import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTicket } from "@/lib/help-center";

export const metadata: Metadata = {
  title: "Support Ticket — Change Risk Radar",
};

export const dynamic = "force-dynamic";

export default async function TicketDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ ticketId: string }>;
  searchParams: Promise<{ email?: string }>;
}) {
  const { ticketId } = await params;
  const { email } = await searchParams;
  const ticket = await getTicket(ticketId);

  if (!ticket) notFound();

  // Require email match for unauthenticated access
  if (email && ticket.reporter_email !== email) {
    notFound();
  }

  const statusColors: Record<string, string> = {
    open: "bg-blue-100 text-blue-700",
    in_progress: "bg-yellow-100 text-yellow-700",
    waiting_on_customer: "bg-orange-100 text-orange-700",
    resolved: "bg-green-100 text-green-700",
    closed: "bg-gray-100 text-gray-700",
  };

  const priorityColors: Record<string, string> = {
    low: "text-gray-500",
    normal: "text-blue-600",
    high: "text-orange-600",
    urgent: "text-red-600 font-bold",
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-6 py-10">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
          <Link href="/help" className="hover:text-indigo-600">Help Center</Link>
          <span>›</span>
          <span className="text-gray-800">Ticket {ticket.ticket_number}</span>
        </div>

        {/* Ticket header */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h1 className="text-xl font-bold text-gray-900">{ticket.subject}</h1>
              <p className="text-sm text-gray-500 mt-1">
                {ticket.ticket_number} · Opened {new Date(ticket.created_at).toLocaleString()}
              </p>
            </div>
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusColors[ticket.status] ?? "bg-gray-100 text-gray-700"}`}>
              {ticket.status.replace("_", " ")}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-gray-500 text-xs uppercase tracking-wide mb-1">Category</p>
              <p className="font-medium text-gray-800 capitalize">{ticket.category.replace("_", " ")}</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs uppercase tracking-wide mb-1">Priority</p>
              <p className={`font-medium capitalize ${priorityColors[ticket.priority]}`}>{ticket.priority}</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs uppercase tracking-wide mb-1">Last Updated</p>
              <p className="font-medium text-gray-800">{new Date(ticket.updated_at).toLocaleDateString()}</p>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{ticket.description}</p>
          </div>
        </div>

        {/* Messages */}
        {ticket.messages && ticket.messages.length > 0 && (
          <div className="space-y-4 mb-6">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Conversation</h2>
            {ticket.messages.map(msg => {
              const isSupport = msg.sender_email.includes("change-risk-radar");
              return (
                <div
                  key={msg.id}
                  className={`rounded-xl border p-5 ${
                    isSupport
                      ? "bg-indigo-50 border-indigo-200"
                      : "bg-white border-gray-200"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-gray-800">
                      {msg.sender_name ?? msg.sender_email}
                      {isSupport && (
                        <span className="ml-2 text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
                          Support Team
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-gray-400">{new Date(msg.created_at).toLocaleString()}</p>
                  </div>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{msg.body}</p>
                </div>
              );
            })}
          </div>
        )}

        {/* Status info */}
        {ticket.status === "resolved" ? (
          <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
            <p className="text-green-700 font-semibold">This ticket has been resolved ✅</p>
            <p className="text-sm text-green-600 mt-1">
              Resolved on {new Date(ticket.resolved_at!).toLocaleString()}
            </p>
            <Link
              href="/support/new"
              className="inline-block mt-4 text-sm text-indigo-600 hover:underline"
            >
              Open a new ticket
            </Link>
          </div>
        ) : (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
            <p className="text-sm text-blue-700">
              Our team is working on your ticket. You&apos;ll receive email updates as we make progress.
              Response time: <strong>4 business hours</strong> for normal priority.
            </p>
          </div>
        )}

        <div className="mt-8 flex gap-4 text-sm">
          <Link href="/help" className="text-indigo-600 hover:underline">Help Center</Link>
          <Link href="/status" className="text-indigo-600 hover:underline">System Status</Link>
        </div>
      </div>
    </div>
  );
}
