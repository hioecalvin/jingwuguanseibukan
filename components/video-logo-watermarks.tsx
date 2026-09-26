import Image from "next/image";

type VideoLogoWatermarksProps = {
  classLogoUrl: string | null;
  includeOrganizationLogo: boolean;
};

function safeClassLogoUrl(value: string | null) {
  if (!value) {
    return null;
  }

  try {
    const url = new URL(value);

    return url.protocol === "https:"
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

export default function VideoLogoWatermarks({
  classLogoUrl,
  includeOrganizationLogo,
}: VideoLogoWatermarksProps) {
  const safeClassLogo =
    safeClassLogoUrl(classLogoUrl);

  if (
    !includeOrganizationLogo &&
    !safeClassLogo
  ) {
    return null;
  }

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-10"
      data-video-logo-watermarks
    >
      {includeOrganizationLogo && (
        <div className="absolute left-3 top-3 rounded-xl border border-white/15 bg-black/45 p-1.5 shadow-lg backdrop-blur-sm sm:left-4 sm:top-4 sm:p-2">
          <Image
            src="/js-logo.jpeg"
            alt=""
            width={72}
            height={72}
            className="h-10 w-10 rounded-lg object-contain opacity-80 sm:h-14 sm:w-14"
          />
        </div>
      )}

      {safeClassLogo && (
        <div className="absolute right-3 top-3 rounded-xl border border-white/15 bg-black/45 p-1.5 shadow-lg backdrop-blur-sm sm:right-4 sm:top-4 sm:p-2">
          {/* Runtime class logos intentionally bypass Next image optimization. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={safeClassLogo}
            alt=""
            className="h-10 w-10 rounded-lg object-contain opacity-80 sm:h-14 sm:w-14"
          />
        </div>
      )}
    </div>
  );
}
