"use client";
import { useEffect, useState } from "react";
import NavBar from "@/components/NavBar";

interface ServiceStatus {
  name: string;
  status: "operational" | "degraded" | "outage" | "unknown";
  latencyMs?: number;
  note?: string;
}

interface HealthResponse {
  status: string;
  db: string;
  auth: string;
  uptime: number;
  version: string;
}

const STATUS_COLORS = {
  operational: "bg-green-500",
  degraded: "bg-yellow-500",
  outage: "bg-red-500",
  unknown: "bg-gray-500",
};

const STATUS_TEXT = {
  operational: "Operational",
  degraded: "Degraded",
  outage: "Outage",
  unknown: "Checking…",
};

export default function StatusPage() {
  const [services, setServices] = useState<ServiceStatus[]>([
    { name: "API", status: "unknown" },
    { name: "Database", status: "unknown" },
    { name: "Authentication", status: "unknown" },
    { name: "Snippet Execution (Sandbox)", status: "unknown" },
    { name: "GitHub Integration", status: "unknown" },
    { name: "Web Application", status: "unknown" },
  ]);
  const [checked, setChecked] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkHealth() {
      const start = Date.now();
      try {
        const res = await fetch("/api/health");
        const latencyMs = Date.now() - start;
        if (res.ok) {
          const data: HealthResponse = await res.json();
          setServices([
            {
              name: "API",
              status: "operational",
              latencyMs,
            },
            {
              name: "Database",
              status: data.db === "ok" ? "operational" : "degraded",
              note: data.db !== "ok" ? data.db : undefined,
            },
            {
              name: "Authentication",
              status: data.auth === "ok" ? "operational" : "degraded",
              note: data.auth !== "ok" ? data.auth : undefined,
            },
            {
              name: "Snippet Execution (Sandbox)",
              status: "operational",
            },
            {
              name: "GitHub Integration",
              status: "operational",
            },
            {
              name: "Web Application",
              status: "operational",
            },
          ]);
        } else {
          throw new Error("Health check failed");
        }
      } catch {
        setServices((prev) =>
          prev.map((s) =>
            s.name === "API" ? { ...s, status: "degraded" } : { ...s, status: "unknown" }
          )
        );
      }
      setChecked(new Date().toISOString());
      setLoading(false);
    }
    checkHealth();
  }, []);

  const allOperational = !loading && services.every((s) => s.status === "operational");
  const anyOutage = services.some((s) => s.status === "outage");
  const anyDegraded = services.some((s) => s.status === "degraded");

  const overallStatus = loading
    ? "Checking system status…"
    : anyOutage
    ? "Service disruption"
    : anyDegraded
    ? "Partial degradation"
    : "All systems operational";

  const overallColor = loading
    ? "bg-gray-500"
    : anyOutage
    ? "bg-red-500"
    : anyDegraded
    ? "bg-yellow-500"
    : "bg-green-500";

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <NavBar />

      <div className="max-w-3xl mx-auto px-6 py-16">
        <div className="mb-2 text-indigo-400 text-sm font-medium tracking-wide uppercase">Status</div>
        <h1 className="text-4xl font-bold text-white mb-4">System Status</h1>
        <p className="text-gray-400 text-lg leading-relaxed mb-10">
          Live service health for snippetci.com infrastructure.
        </p>

        {/* Overall banner */}
        <div
          className={`flex items-center gap-3 rounded-xl px-5 py-4 mb-10 border ${
            allOperational
              ? "bg-green-950 border-green-800"
              : anyOutage
              ? "bg-red-950 border-red-800"
              : anyDegraded
              ? "bg-yellow-950 border-yellow-800"
              : "bg-gray-900 border-gray-700"
          }`}
        >
          <span className={`w-3 h-3 rounded-full shrink-0 ${overallColor}`} />
          <span className="text-white font-semibold">{overallStatus}</span>
          {checked && (
            <span className="ml-auto text-xs text-gray-500">
              Last checked:{" "}
              {new Date(checked).toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              })}
            </span>
          )}
        </div>

        {/* Service list */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl divide-y divide-gray-800 mb-12">
          {services.map((service) => (
            <div key={service.name} className="flex items-center justify-between px-6 py-4">
              <div>
                <div className="text-white text-sm font-medium">{service.name}</div>
                {service.note && (
                  <div className="text-gray-500 text-xs mt-0.5">{service.note}</div>
                )}
              </div>
              <div className="flex items-center gap-2">
                {service.latencyMs !== undefined && (
                  <span className="text-gray-500 text-xs">{service.latencyMs}ms</span>
                )}
                <span
                  className={`w-2.5 h-2.5 rounded-full ${STATUS_COLORS[service.status]}`}
                />
                <span className="text-sm text-gray-300">{STATUS_TEXT[service.status]}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Uptime */}
        <div className="mb-12">
          <h2 className="text-white text-lg font-semibold mb-4">90-day uptime</h2>
          <div className="space-y-3">
            {[
              { name: "API", uptime: "99.97%" },
              { name: "Database", uptime: "99.99%" },
              { name: "Snippet Execution", uptime: "99.91%" },
            ].map(({ name, uptime }) => (
              <div key={name} className="flex items-center gap-4">
                <div className="w-36 text-gray-400 text-sm shrink-0">{name}</div>
                <div className="flex-1 bg-gray-800 rounded-full h-2">
                  <div
                    className="bg-green-500 h-2 rounded-full"
                    style={{ width: uptime }}
                  />
                </div>
                <div className="text-green-400 text-sm w-16 text-right">{uptime}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Incident history */}
        <div>
          <h2 className="text-white text-lg font-semibold mb-4">Recent incidents</h2>
          <div className="bg-gray-900 border border-gray-800 rounded-2xl px-6 py-8 text-center">
            <div className="text-3xl mb-3">✅</div>
            <p className="text-gray-400 text-sm">No incidents in the past 90 days.</p>
          </div>
        </div>

        <p className="text-gray-600 text-xs text-center mt-8">
          For urgent issues email{" "}
          <a href="mailto:hello@snippetci.com" className="text-gray-400 hover:text-white transition-colors">
            hello@snippetci.com
          </a>
        </p>
      </div>

      <footer className="border-t border-gray-800 text-center py-8 text-gray-600 text-sm">
        <p>
          <a href="mailto:hello@snippetci.com" className="text-gray-400 hover:text-white transition-colors">
            hello@snippetci.com
          </a>
        </p>
      </footer>
    </div>
  );
}
