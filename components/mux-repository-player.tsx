"use client";

import MuxPlayer from "@mux/mux-player-react/lazy";
import { useEffect, useMemo, useState } from "react";

import { createClient } from "@/lib/supabase/client";

type Props = {
  contentId: string;
  title: string;
};

type PlaybackAuthorization = {
  playbackId: string;
  playbackToken: string;
};

export default function MuxRepositoryPlayer({ contentId, title }: Props) {
  const supabase = useMemo(() => createClient(), []);
  const [authorization, setAuthorization] = useState<PlaybackAuthorization | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setAuthorization(null);
    setError("");
    async function authorize() {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        if (active) setError("Sign in again to watch this video.");
        return;
      }
      try {
        const response = await fetch(`/api/repository/mux/playback/${encodeURIComponent(contentId)}`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
          cache: "no-store",
        });
        const result = await response.json() as Partial<PlaybackAuthorization> & { error?: string };
        if (!response.ok || !result.playbackId || !result.playbackToken) {
          throw new Error(result.error ?? "Unable to authorize video playback.");
        }
        if (active) setAuthorization({ playbackId: result.playbackId, playbackToken: result.playbackToken });
      } catch {
        if (active) setError("Unable to authorize video playback. Try again shortly.");
      }
    }
    void authorize();
    return () => { active = false; };
  }, [contentId, supabase]);

  if (error) {
    return <div className="flex h-full items-center justify-center p-6 text-center text-sm text-red-300" role="alert">{error}</div>;
  }
  if (!authorization) {
    return <div className="flex h-full items-center justify-center p-6 text-sm text-neutral-400" role="status">Preparing secure video playback…</div>;
  }
  return (
    <MuxPlayer
      playbackId={authorization.playbackId}
      tokens={{ playback: authorization.playbackToken }}
      streamType="on-demand"
      poster=""
      metadata={{ video_id: contentId, video_title: title }}
      disableTracking
      disableCookies
      accentColor="#38bdf8"
      className="h-full w-full"
      title={title}
    />
  );
}
