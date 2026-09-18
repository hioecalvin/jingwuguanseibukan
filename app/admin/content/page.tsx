"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  extractYouTubeVideoId,
  getYouTubeEmbedUrl,
} from "@/lib/video/youtube";

type ClassItem = {
  id: string;
  name: string;
};

type Rank = {
  id: string;
  class_id: string;
  name: string;
  sort_order: number;
};

type Tier = {
  id: string;
  rank_id: string;
  name: string;
  sort_order: number;
};

type ContentItem = {
  id: string;
  class_id: string;
  rank_id: string;
  sub_rank_id: string;
  title: string;
  description: string | null;
  video_provider: string | null;
  video_id: string | null;
  status: string;
  sort_order: number;
};

export default function AdminContentPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [ranks, setRanks] = useState<Rank[]>([]);
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [content, setContent] = useState<ContentItem[]>([]);

  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedRankId, setSelectedRankId] = useState("");
  const [selectedTierId, setSelectedTierId] = useState("");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const [videoInput, setVideoInput] = useState("");

  const [status, setStatus] = useState("draft");
  const [sortOrder, setSortOrder] = useState(1);

  const [editingId, setEditingId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<
    "success" | "error" | ""
  >("");

  const loadRanks = useCallback(async () => {
    const { data, error } = await supabase
      .from("ranks")
      .select(`
        id,
        class_id,
        name,
        sort_order
      `)
      .order("sort_order", {
        ascending: true,
      });

    if (error) {
      setMessage(error.message);
      setMessageType("error");
      return;
    }

    setRanks((data ?? []) as Rank[]);
  }, [supabase]);

  const loadTiers = useCallback(async () => {
    const { data, error } = await supabase
      .from("sub_ranks")
      .select(`
        id,
        rank_id,
        name,
        sort_order
      `)
      .order("sort_order", {
        ascending: true,
      });

    if (error) {
      setMessage(error.message);
      setMessageType("error");
      return;
    }

    setTiers((data ?? []) as Tier[]);
  }, [supabase]);

  const loadContent = useCallback(async () => {
    const { data, error } = await supabase
      .from("content")
      .select(`
        id,
        class_id,
        rank_id,
        sub_rank_id,
        title,
        description,
        video_provider,
        video_id,
        status,
        sort_order
      `)
      .order("sort_order", {
        ascending: true,
      });

    if (error) {
      setMessage(error.message);
      setMessageType("error");
      return;
    }

    setContent((data ?? []) as ContentItem[]);
  }, [supabase]);

  useEffect(() => {
    async function loadPage() {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        router.replace("/login");
        return;
      }

      const { data: classData, error: classError } =
        await supabase
          .from("classes")
          .select("id, name")
          .eq("active", true)
          .order("name");

      if (classError) {
        setMessage(classError.message);
        setMessageType("error");
        setLoading(false);
        return;
      }

      setClasses((classData ?? []) as ClassItem[]);

      if (classData && classData.length > 0) {
        setSelectedClassId(classData[0].id);
      }

      await Promise.all([
        loadRanks(),
        loadTiers(),
        loadContent(),
      ]);

      setLoading(false);
    }

    loadPage();
  }, [loadContent, loadRanks, loadTiers, router, supabase]);

  const filteredRanks = ranks.filter(
    (rank) =>
      rank.class_id === selectedClassId
  );

  const filteredTiers = tiers.filter(
    (tier) =>
      tier.rank_id === selectedRankId
  );

  const filteredContent =
    content.filter(
      (item) =>
        item.class_id === selectedClassId &&
        item.rank_id === selectedRankId &&
        item.sub_rank_id === selectedTierId
    );

  useEffect(() => {
    if (!selectedClassId) {
      setSelectedRankId("");
      setSelectedTierId("");
      return;
    }

    const firstRank = ranks.find(
      (rank) =>
        rank.class_id === selectedClassId
    );

    setSelectedRankId(
      firstRank?.id ?? ""
    );

    setSelectedTierId("");
  }, [selectedClassId, ranks]);

  useEffect(() => {
    if (!selectedRankId) {
      setSelectedTierId("");
      return;
    }

    const firstTier = tiers.find(
      (tier) =>
        tier.rank_id === selectedRankId
    );

    setSelectedTierId(
      firstTier?.id ?? ""
    );
  }, [selectedRankId, tiers]);

  function getVideoId() {
    if (
      !videoInput.trim()
    ) {
      return "";
    }

    return extractYouTubeVideoId(videoInput) ?? "";
  }

  const parsedVideoId =
    getVideoId();

  function getPreviewUrl() {
    if (!parsedVideoId) {
      return null;
    }

    return getYouTubeEmbedUrl(parsedVideoId);
  }

  const previewUrl =
    getPreviewUrl();

  function resetForm() {
    setEditingId(null);

    setTitle("");
    setDescription("");

    setVideoInput("");

    setStatus("draft");
    setSortOrder(1);
  }

  async function saveContent(
    e: React.FormEvent
  ) {
    e.preventDefault();

    if (
      !selectedClassId ||
      !selectedRankId ||
      !selectedTierId ||
      !title.trim()
    ) {
      setMessage(
        "Please choose Class, Rank, Tier and enter a Title."
      );

      setMessageType(
        "error"
      );

      return;
    }

    if (
      videoInput.trim() &&
      !parsedVideoId
    ) {
      setMessage(
        "The YouTube URL or video ID is invalid."
      );

      setMessageType(
        "error"
      );

      return;
    }

    setProcessing(true);
    setMessage("");
    setMessageType("");

    if (editingId) {
      const {
        error,
      } = await supabase.rpc(
        "update_repository_content",
        {
          target_content:
            editingId,

          content_title:
            title.trim(),

          content_description:
            description.trim(),

          provider:
            videoInput.trim()
              ? "youtube"
              : "",

          provider_video_id:
            parsedVideoId,

          content_status:
            status,

          content_sort_order:
            sortOrder,
        }
      );

      if (error) {
        setMessage(
          error.message
        );

        setMessageType(
          "error"
        );

        setProcessing(false);
        return;
      }

      setMessage(
        "Content updated successfully."
      );

      setMessageType(
        "success"
      );
    } else {
      const {
        error,
      } = await supabase.rpc(
        "create_repository_content",
        {
          target_class:
            selectedClassId,

          target_rank:
            selectedRankId,

          target_sub_rank:
            selectedTierId,

          content_title:
            title.trim(),

          content_description:
            description.trim(),

          provider:
            videoInput.trim()
              ? "youtube"
              : "",

          provider_video_id:
            parsedVideoId,

          content_status:
            status,

          content_sort_order:
            sortOrder,
        }
      );

      if (error) {
        setMessage(
          error.message
        );

        setMessageType(
          "error"
        );

        setProcessing(false);
        return;
      }

      setMessage(
        "Content created successfully."
      );

      setMessageType(
        "success"
      );
    }

    await loadContent();

    resetForm();

    setProcessing(false);
  }

  function editContent(
    item: ContentItem
  ) {
    setSelectedClassId(
      item.class_id
    );

    setSelectedRankId(
      item.rank_id
    );

    setSelectedTierId(
      item.sub_rank_id
    );

    setEditingId(
      item.id
    );

    setTitle(
      item.title
    );

    setDescription(
      item.description ?? ""
    );

    setVideoInput(
      item.video_id ?? ""
    );

    setStatus(
      item.status
    );

    setSortOrder(
      item.sort_order
    );

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function deleteContent(
    item: ContentItem
  ) {
    const confirmed =
      window.confirm(
        `Delete "${item.title}"?`
      );

    if (!confirmed) {
      return;
    }

    setProcessing(true);
    setMessage("");
    setMessageType("");

    const {
      error,
    } = await supabase.rpc(
      "delete_repository_content",
      {
        target_content:
          item.id,
      }
    );

    if (error) {
      setMessage(
        error.message
      );

      setMessageType(
        "error"
      );

      setProcessing(false);
      return;
    }

    setContent(
      (current) =>
        current.filter(
          (contentItem) =>
            contentItem.id !==
            item.id
        )
    );

    if (
      editingId ===
      item.id
    ) {
      resetForm();
    }

    setMessage(
      "Content deleted."
    );

    setMessageType(
      "success"
    );

    setProcessing(false);
  }

  function rankName(
    rankId: string
  ) {
    return (
      ranks.find(
        (rank) =>
          rank.id === rankId
      )?.name ?? "-"
    );
  }

  function tierName(
    tierId: string
  ) {
    return (
      tiers.find(
        (tier) =>
          tier.id === tierId
      )?.name ?? "-"
    );
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-neutral-950 text-white">

        <p className="text-neutral-400">
          Loading content manager...
        </p>

      </main>
    );
  }

  return (
    <main className="min-h-screen bg-neutral-950 px-4 py-8 text-white sm:px-6">

      <div className="mx-auto max-w-6xl">

        {/* HEADER */}

        <header className="flex flex-col gap-5 border-b border-neutral-800 pb-7 sm:flex-row sm:items-center sm:justify-between">

          <div className="flex items-center gap-4">

            <Image
              src="/js-logo.jpeg"
              alt="Jingwuguan Seibukan"
              width={70}
              height={70}
              className="rounded-xl"
            />

            <div>

              <p className="text-sm font-medium uppercase tracking-[0.2em] text-red-400">
                Administration
              </p>

              <h1 className="text-3xl font-bold">
                Content Management
              </h1>

              <p className="mt-1 text-sm text-neutral-400">
                Add, edit and publish
                repository content.
              </p>

            </div>

          </div>


          <button
            type="button"
            onClick={() =>
              router.push(
                "/admin"
              )
            }
            className="self-start rounded-lg border border-neutral-700 px-4 py-2 text-sm text-neutral-300 hover:bg-neutral-800"
          >
            ← Admin
          </button>

        </header>


        {/* MESSAGE */}

        {message && (

          <div
            className={`mt-6 rounded-xl border p-4 ${
              messageType ===
              "success"
                ? "border-green-900 bg-green-950/30 text-green-300"
                : "border-red-900 bg-red-950/30 text-red-300"
            }`}
          >
            {message}
          </div>

        )}


        {/* FORM */}

        <section className="mt-8 rounded-2xl border border-neutral-800 bg-neutral-900 p-6">

          <div className="flex items-center justify-between gap-4">

            <div>

              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-400">
                Repository Content
              </p>

              <h2 className="mt-1 text-2xl font-bold">
                {editingId
                  ? "Edit Content"
                  : "Add Content"}
              </h2>

            </div>


            {editingId && (

              <button
                type="button"
                onClick={
                  resetForm
                }
                className="rounded-lg border border-neutral-700 px-4 py-2 text-sm text-neutral-300 hover:bg-neutral-800"
              >
                Cancel Edit
              </button>

            )}

          </div>


          <form
            onSubmit={
              saveContent
            }
            className="mt-6 space-y-5"
          >

            {/* CLASS / RANK / TIER */}

            <div className="grid gap-4 md:grid-cols-3">

              <div>

                <label className="mb-2 block text-sm font-medium">
                  Class
                </label>

                <select
                  value={
                    selectedClassId
                  }
                  onChange={(e) =>
                    setSelectedClassId(
                      e.target.value
                    )
                  }
                  required
                  className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-white"
                >

                  {classes.map(
                    (classItem) => (

                      <option
                        key={
                          classItem.id
                        }
                        value={
                          classItem.id
                        }
                      >
                        {
                          classItem.name
                        }
                      </option>

                    )
                  )}

                </select>

              </div>


              <div>

                <label className="mb-2 block text-sm font-medium">
                  Rank
                </label>

                <select
                  value={
                    selectedRankId
                  }
                  onChange={(e) =>
                    setSelectedRankId(
                      e.target.value
                    )
                  }
                  required
                  className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-white"
                >

                  <option value="">
                    Select Rank
                  </option>

                  {filteredRanks.map(
                    (rank) => (

                      <option
                        key={
                          rank.id
                        }
                        value={
                          rank.id
                        }
                      >
                        {rank.name}
                      </option>

                    )
                  )}

                </select>

              </div>


              <div>

                <label className="mb-2 block text-sm font-medium">
                  Tier
                </label>

                <select
                  value={
                    selectedTierId
                  }
                  onChange={(e) =>
                    setSelectedTierId(
                      e.target.value
                    )
                  }
                  required
                  disabled={
                    !selectedRankId
                  }
                  className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-white disabled:opacity-50"
                >

                  <option value="">
                    Select Tier
                  </option>

                  {filteredTiers.map(
                    (tier) => (

                      <option
                        key={
                          tier.id
                        }
                        value={
                          tier.id
                        }
                      >
                        {tier.name}
                      </option>

                    )
                  )}

                </select>

              </div>

            </div>


            {/* TITLE */}

            <div>

              <label className="mb-2 block text-sm font-medium">
                Title
              </label>

              <input
                value={title}
                onChange={(e) =>
                  setTitle(
                    e.target.value
                  )
                }
                required
                placeholder="Example: Tai no Henko"
                className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-white"
              />

            </div>


            {/* DESCRIPTION */}

            <div>

              <label className="mb-2 block text-sm font-medium">
                Description
              </label>

              <textarea
                value={
                  description
                }
                onChange={(e) =>
                  setDescription(
                    e.target.value
                  )
                }
                rows={5}
                placeholder="Training notes or explanation"
                className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-white"
              />

            </div>


            {/* VIDEO */}

            <div className="grid gap-4 md:grid-cols-2">

              <div>

                <label className="mb-2 block text-sm font-medium">
                  Video Provider
                </label>

                <div className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-white">
                  YouTube (Unlisted)
                </div>

              </div>


              <div>

                <label className="mb-2 block text-sm font-medium">
                  Video URL or ID
                </label>

                <input
                  value={
                    videoInput
                  }
                  onChange={(e) =>
                    setVideoInput(
                      e.target.value
                    )
                  }
                  placeholder="Paste an unlisted YouTube URL or video ID"
                  className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-white"
                />

                {videoInput.trim() && (

                  <p
                    className={`mt-2 text-xs ${
                      parsedVideoId
                        ? "text-green-400"
                        : "text-red-400"
                    }`}
                  >
                    {parsedVideoId
                      ? `Detected ID: ${parsedVideoId}`
                      : "Could not detect a valid video ID."}
                  </p>

                )}

              </div>

            </div>


            {/* VIDEO PREVIEW */}

            {previewUrl && (

              <div>

                <p className="mb-2 text-sm font-medium">
                  Video Preview
                </p>

                <div className="overflow-hidden rounded-xl border border-neutral-800 bg-black">

                  <div className="aspect-video">

                    <iframe
                      src={
                        previewUrl
                      }
                      title="Video Preview"
                      className="h-full w-full"
                      loading="lazy"
                      referrerPolicy="strict-origin-when-cross-origin"
                      sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                    />

                  </div>

                </div>

              </div>

            )}


            {/* STATUS / SORT */}

            <div className="grid gap-4 md:grid-cols-2">

              <div>

                <label className="mb-2 block text-sm font-medium">
                  Status
                </label>

                <select
                  value={status}
                  onChange={(e) =>
                    setStatus(
                      e.target.value
                    )
                  }
                  className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-white"
                >

                  <option value="draft">
                    Draft
                  </option>

                  <option value="published">
                    Published
                  </option>

                </select>

              </div>


              <div>

                <label className="mb-2 block text-sm font-medium">
                  Sort Order
                </label>

                <input
                  type="number"
                  min={0}
                  value={
                    sortOrder
                  }
                  onChange={(e) =>
                    setSortOrder(
                      Number(
                        e.target.value
                      )
                    )
                  }
                  className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-white"
                />

              </div>

            </div>


            {/* SAVE */}

            <button
              type="submit"
              disabled={
                processing
              }
              className="w-full rounded-lg bg-sky-500 py-3 font-semibold text-white transition hover:bg-sky-400 disabled:opacity-50"
            >
              {processing
                ? "Saving..."
                : editingId
                ? "Update Content"
                : "Add Content"}
            </button>

          </form>

        </section>


        {/* EXISTING CONTENT */}

        <section className="mt-8">

          <div>

            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-400">
              Existing Content
            </p>

            <h2 className="mt-1 text-2xl font-bold">
              {
                filteredContent.length
              }{" "}
              Item
              {filteredContent.length ===
              1
                ? ""
                : "s"}
            </h2>

          </div>


          {!selectedTierId ? (

            <div className="mt-4 rounded-2xl border border-neutral-800 bg-neutral-900 p-6 text-neutral-400">
              Select a Class, Rank and Tier.
            </div>

          ) : filteredContent.length ===
            0 ? (

            <div className="mt-4 rounded-2xl border border-neutral-800 bg-neutral-900 p-6 text-neutral-400">
              No content for this tier yet.
            </div>

          ) : (

            <div className="mt-4 space-y-4">

              {filteredContent.map(
                (item) => (

                  <article
                    key={
                      item.id
                    }
                    className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6"
                  >

                    <div className="flex flex-col justify-between gap-5 md:flex-row">

                      <div>

                        <div className="flex flex-wrap items-center gap-3">

                          <h3 className="text-xl font-bold">
                            {item.title}
                          </h3>


                          <span
                            className={`rounded-full border px-3 py-1 text-xs font-medium ${
                              item.status ===
                              "published"
                                ? "border-green-800 bg-green-950/30 text-green-300"
                                : "border-yellow-800 bg-yellow-950/30 text-yellow-300"
                            }`}
                          >
                            {item.status ===
                            "published"
                              ? "Published"
                              : "Draft"}
                          </span>

                        </div>


                        <p className="mt-2 text-sm text-neutral-500">
                          {rankName(
                            item.rank_id
                          )}
                          {" · "}
                          {tierName(
                            item.sub_rank_id
                          )}
                        </p>


                        {item.description && (

                          <p className="mt-3 whitespace-pre-line text-sm leading-6 text-neutral-400">
                            {
                              item.description
                            }
                          </p>

                        )}


                        {item.video_id && (

                          <p className="mt-3 text-xs text-neutral-600">
                            {
                              item.video_provider
                            }
                            {" · "}
                            {
                              item.video_id
                            }
                          </p>

                        )}


                        <p className="mt-2 text-xs text-neutral-600">
                          Sort order:{" "}
                          {
                            item.sort_order
                          }
                        </p>

                      </div>


                      <div className="flex flex-wrap items-start gap-3">

                        <button
                          type="button"
                          disabled={
                            processing
                          }
                          onClick={() =>
                            editContent(
                              item
                            )
                          }
                          className="rounded-lg border border-sky-800 px-4 py-2 text-sm font-medium text-sky-300 hover:bg-sky-950/40 disabled:opacity-50"
                        >
                          Edit
                        </button>


                        <button
                          type="button"
                          disabled={
                            processing
                          }
                          onClick={() =>
                            deleteContent(
                              item
                            )
                          }
                          className="rounded-lg border border-red-900 px-4 py-2 text-sm font-medium text-red-400 hover:bg-red-950/40 disabled:opacity-50"
                        >
                          Delete
                        </button>

                      </div>

                    </div>

                  </article>

                )
              )}

            </div>

          )}

        </section>

      </div>

    </main>
  );
}
