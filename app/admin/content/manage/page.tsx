"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";

type ContentItem = {
  id: string;
  title: string;
  description: string | null;
  video_provider: "youtube";
  video_id: string | null;
  status: "draft" | "published";
  sort_order: number;
  classes: {
    id: string;
    name: string;
  } | null;
  ranks: {
    id: string;
    name: string;
  } | null;
  sub_ranks: {
    id: string;
    name: string;
  } | null;
};

export default function ManageContentPage() {
  const supabase = useMemo(() => createClient(), []);

  const [items, setItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const loadContent = useCallback(async () => {
    setLoading(true);
    setMessage("");

    const { data, error } = await supabase
      .from("content")
      .select(`
        id,
        title,
        description,
        video_provider,
        video_id,
        status,
        sort_order,
        classes (
          id,
          name
        ),
        ranks (
          id,
          name
        ),
        sub_ranks (
          id,
          name
        )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    setItems((data ?? []) as unknown as ContentItem[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    void loadContent();
  }, [loadContent]);

  async function toggleStatus(item: ContentItem) {
    const nextStatus =
      item.status === "published" ? "draft" : "published";

    const { error } = await supabase.rpc(
      "update_repository_content",
      {
        target_content: item.id,
        content_title: item.title,
        content_description: item.description ?? "",
        provider: item.video_provider,
        provider_video_id: item.video_id ?? "",
        content_status: nextStatus,
        content_sort_order: item.sort_order,
      }
    );

    if (error) {
      setMessage(error.message);
      return;
    }

    setItems((current) =>
      current.map((currentItem) =>
        currentItem.id === item.id
          ? { ...currentItem, status: nextStatus }
          : currentItem
      )
    );
  }

  async function deleteContent(item: ContentItem) {
    const confirmed = window.confirm(
      `Delete "${item.title}"?`
    );

    if (!confirmed) {
      return;
    }

    const { error } = await supabase.rpc(
      "delete_repository_content",
      {
        target_content: item.id,
      }
    );

    if (error) {
      setMessage(error.message);
      return;
    }

    setItems((current) =>
      current.filter((currentItem) => currentItem.id !== item.id)
    );
  }

  return (
    <main className="min-h-screen bg-neutral-950 px-4 py-8 text-white sm:px-6">
      <div className="mx-auto max-w-6xl">
        <header className="flex items-center gap-4 border-b border-neutral-800 pb-7">
          <Image
            src="/js-logo.jpeg"
            alt="Jingwuguan Seibukan"
            width={65}
            height={65}
            className="rounded-xl"
          />

          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-red-400">
              Administration
            </p>

            <h1 className="text-3xl font-bold">
              Manage Content
            </h1>
          </div>
        </header>

        {message && (
          <div className="mt-6 rounded-xl border border-red-900 bg-red-950/30 p-4 text-red-300">
            {message}
          </div>
        )}

        {loading ? (
          <div className="mt-8 text-neutral-400">
            Loading content...
          </div>
        ) : items.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-neutral-800 bg-neutral-900 p-8 text-center">
            No content has been added yet.
          </div>
        ) : (
          <div className="mt-8 space-y-4">
            {items.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6"
              >
                <div className="flex flex-col justify-between gap-5 md:flex-row">
                  <div>
                    <h2 className="text-xl font-bold">
                      {item.title}
                    </h2>

                    <p className="mt-2 text-sm text-neutral-400">
                      {item.classes?.name} → {item.ranks?.name} →{" "}
                      {item.sub_ranks?.name}
                    </p>

                    <p className="mt-1 text-sm text-neutral-500">
                      Sort order: {item.sort_order}
                    </p>

                    {item.description && (
                      <p className="mt-3 text-sm text-neutral-400">
                        {item.description}
                      </p>
                    )}
                  </div>

                  <div className="flex items-start">
                    <span
                      className={`rounded-full border px-3 py-1 text-sm ${
                        item.status === "published"
                          ? "border-green-700 bg-green-950/40 text-green-300"
                          : "border-yellow-700 bg-yellow-950/40 text-yellow-300"
                      }`}
                    >
                      {item.status === "published"
                        ? "Published"
                        : "Draft"}
                    </span>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-3 border-t border-neutral-800 pt-5">
                  <button
                    onClick={() => toggleStatus(item)}
                    className="rounded-lg border border-sky-800 px-4 py-2 text-sm font-medium text-sky-300 hover:bg-sky-950/40"
                  >
                    {item.status === "published"
                      ? "Move to Draft"
                      : "Publish"}
                  </button>

                  <button
                    onClick={() => deleteContent(item)}
                    className="rounded-lg border border-red-900 px-4 py-2 text-sm font-medium text-red-400 hover:bg-red-950/40"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
