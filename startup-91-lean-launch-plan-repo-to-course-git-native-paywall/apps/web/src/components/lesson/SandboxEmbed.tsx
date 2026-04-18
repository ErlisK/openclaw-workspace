interface SandboxEmbedProps {
  url: string | null;
  enrolled: boolean;
  title?: string;
}

export function SandboxEmbed({ url, enrolled, title = 'Live Sandbox' }: SandboxEmbedProps) {
  if (!url) return null;

  if (!enrolled) {
    return (
      <div className="my-8 overflow-hidden rounded-2xl border border-gray-200 bg-gradient-to-br from-gray-50 to-white">
        {/* Blurred preview placeholder */}
        <div className="relative h-48 bg-gray-900 flex items-center justify-center overflow-hidden">
          {/* Fake editor background */}
          <div className="absolute inset-0 opacity-30 select-none pointer-events-none p-4 font-mono text-xs text-green-400 leading-relaxed overflow-hidden">
            <div>{'$ git init my-project'}</div>
            <div>{'Initialized empty Git repository'}</div>
            <div>{'$ git add .'}</div>
            <div>{'$ git commit -m "initial commit"'}</div>
            <div>{'[main (root-commit) 3aa25de] initial commit'}</div>
            <div>{'$ git log --oneline'}</div>
            <div>{'3aa25de initial commit'}</div>
          </div>
          {/* Blur overlay */}
          <div className="absolute inset-0 backdrop-blur-sm bg-gray-900/60" />
          {/* Lock icon */}
          <div className="relative z-10 text-center">
            <div className="text-4xl mb-2">🔒</div>
            <p className="text-white font-semibold text-sm">Sandbox locked</p>
          </div>
        </div>

        {/* CTA */}
        <div className="px-6 py-5 text-center">
          <h3 className="font-semibold text-gray-900 mb-1">Unlock the {title}</h3>
          <p className="text-sm text-gray-600 mb-4">
            Enroll in this course to access the interactive code sandbox.
          </p>
          <a
            href="#enroll"
            className="inline-block rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-700"
          >
            Enroll to unlock →
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="my-8 overflow-hidden rounded-2xl border border-gray-200 shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-4 py-2">
        <span className="text-sm font-medium text-gray-700">🖥 {title}</span>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-gray-500 hover:text-violet-600"
        >
          Open in new tab ↗
        </a>
      </div>
      <div className="h-[520px]">
        <iframe
          src={url}
          title={title}
          className="h-full w-full border-0"
          loading="lazy"
          allow="accelerometer; camera; clipboard-read; clipboard-write; cross-origin-isolated; display-capture; encrypted-media; fullscreen; geolocation; gyroscope; microphone; midi; payment; screen-wake-lock; usb; web-share; xr-spatial-tracking"
          sandbox="allow-forms allow-modals allow-pointer-lock allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts allow-top-navigation-by-user-activation"
        />
      </div>
    </div>
  );
}
