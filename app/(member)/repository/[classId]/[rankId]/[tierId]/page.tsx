"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useParams,
  useRouter,
  useSearchParams,
} from "next/navigation";

import {
  createClient,
} from "@/lib/supabase/client";

type Rank = {
  id: string;
  class_id: string;
  name: string;
  sort_order: number;

  level:
    | "mudansha"
    | "yudansha"
    | null;
};

type Tier = {
  id: string;
  rank_id: string;
  name: string;
  sort_order: number;
};

type ContentItem = {
  id: string;
  title: string;

  description:
    | string
    | null;

  video_provider:
    | string
    | null;

  video_id:
    | string
    | null;

  status: string;
  sort_order: number;
};

export default function RepositoryTierPage() {
  const supabase =
    useMemo(
      () => createClient(),
      []
    );

  const router =
    useRouter();

  const params =
    useParams();

  const searchParams =
    useSearchParams();

  const classId =
    typeof params.classId === "string"
      ? params.classId
      : "";

  const rankId =
    typeof params.rankId === "string"
      ? params.rankId
      : "";

  const tierId =
    typeof params.tierId === "string"
      ? params.tierId
      : "";

  const lessonFromUrl =
    searchParams.get(
      "lesson"
    );

  const [
    rank,
    setRank,
  ] =
    useState<Rank | null>(
      null
    );

  const [
    tier,
    setTier,
  ] =
    useState<Tier | null>(
      null
    );

  const [
    content,
    setContent,
  ] =
    useState<ContentItem[]>(
      []
    );

  const [
    selectedContentId,
    setSelectedContentId,
  ] =
    useState<
      string | null
    >(null);

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    message,
    setMessage,
  ] =
    useState("");

  /*
   * =====================================================
   * LOAD PAGE
   * =====================================================
   */

  useEffect(() => {
    let active =
      true;

    async function loadPage() {
      setLoading(
        true
      );

      setMessage(
        ""
      );

      if (
        !classId ||
        !rankId ||
        !tierId
      ) {
        if (
          active
        ) {
          setMessage(
            "Invalid repository path."
          );

          setLoading(
            false
          );
        }

        return;
      }

      /*
       * CURRENT USER
       */

      const {
        data: {
          user,
        },
        error:
          userError,
      } =
        await supabase
          .auth
          .getUser();

      if (
        userError ||
        !user
      ) {
        router.replace(
          "/login"
        );

        return;
      }

      /*
       * CHECK CLASS MEMBERSHIP
       */

      const {
        data:
          membership,
        error:
          membershipError,
      } =
        await supabase
          .from(
            "class_memberships"
          )
          .select(
            "status"
          )
          .eq(
            "user_id",
            user.id
          )
          .eq(
            "class_id",
            classId
          )
          .maybeSingle();

      if (
        membershipError
      ) {
        if (
          active
        ) {
          setMessage(
            membershipError.message
          );

          setLoading(
            false
          );
        }

        return;
      }

      if (
        !membership
      ) {
        if (
          active
        ) {
          setMessage(
            "You are not enrolled in this class."
          );

          setLoading(
            false
          );
        }

        return;
      }

      if (
        ![
          "active",
          "break_1",
          "break_2",
        ].includes(
          membership.status
        )
      ) {
        if (
          active
        ) {
          setMessage(
            "Your membership does not currently have repository access."
          );

          setLoading(
            false
          );
        }

        return;
      }

      /*
       * LOAD RANK
       */

      const {
        data:
          rankData,
        error:
          rankError,
      } =
        await supabase
          .from(
            "ranks"
          )
          .select(`
            id,
            class_id,
            name,
            sort_order,
            level
          `)
          .eq(
            "id",
            rankId
          )
          .eq(
            "class_id",
            classId
          )
          .maybeSingle();

      if (
        rankError
      ) {
        if (
          active
        ) {
          setMessage(
            rankError.message
          );

          setLoading(
            false
          );
        }

        return;
      }

      if (
        !rankData
      ) {
        if (
          active
        ) {
          setMessage(
            "Rank not found."
          );

          setLoading(
            false
          );
        }

        return;
      }

      /*
       * LOAD TIER
       */

      const {
        data:
          tierData,
        error:
          tierError,
      } =
        await supabase
          .from(
            "sub_ranks"
          )
          .select(`
            id,
            rank_id,
            name,
            sort_order
          `)
          .eq(
            "id",
            tierId
          )
          .eq(
            "rank_id",
            rankId
          )
          .maybeSingle();

      if (
        tierError
      ) {
        if (
          active
        ) {
          setMessage(
            tierError.message
          );

          setLoading(
            false
          );
        }

        return;
      }

      if (
        !tierData
      ) {
        if (
          active
        ) {
          setMessage(
            "Tier not found."
          );

          setLoading(
            false
          );
        }

        return;
      }

      /*
       * LOAD PUBLISHED CONTENT
       */

      const {
        data:
          contentData,
        error:
          contentError,
      } =
        await supabase
          .from(
            "content"
          )
          .select(`
            id,
            title,
            description,
            video_provider,
            video_id,
            status,
            sort_order
          `)
          .eq(
            "class_id",
            classId
          )
          .eq(
            "rank_id",
            rankId
          )
          .eq(
            "sub_rank_id",
            tierId
          )
          .eq(
            "status",
            "published"
          )
          .order(
            "sort_order",
            {
              ascending:
                true,
            }
          );

      if (
        contentError
      ) {
        if (
          active
        ) {
          setMessage(
            contentError.message
          );

          setLoading(
            false
          );
        }

        return;
      }

      const loadedContent =
        (
          contentData ??
          []
        ) as ContentItem[];

      if (
        !active
      ) {
        return;
      }

      setRank(
        rankData as Rank
      );

      setTier(
        tierData as Tier
      );

      setContent(
        loadedContent
      );

      /*
       * OPEN LESSON FROM URL
       */

      if (
        lessonFromUrl &&
        loadedContent.some(
          (
            item
          ) =>
            item.id ===
            lessonFromUrl
        )
      ) {
        setSelectedContentId(
          lessonFromUrl
        );

      } else if (
        loadedContent.length >
        0
      ) {
        setSelectedContentId(
          loadedContent[0].id
        );

      } else {
        setSelectedContentId(
          null
        );
      }

      setLoading(
        false
      );
    }

    loadPage();

    return () => {
      active =
        false;
    };

  }, [
    classId,
    rankId,
    tierId,
    lessonFromUrl,
    router,
    supabase,
  ]);

  /*
   * =====================================================
   * HELPERS
   * =====================================================
   */

  function levelLabel(
    level:
      Rank["level"]
  ) {
    if (
      level ===
      "mudansha"
    ) {
      return "Mudansha (Kyu)";
    }

    if (
      level ===
      "yudansha"
    ) {
      return "Yudansha (Dan)";
    }

    return "Grade";
  }

  function levelBadgeClass(
    level:
      Rank["level"]
  ) {
    if (
      level ===
      "yudansha"
    ) {
      return `
        border-purple-800
        bg-purple-950/30
        text-purple-300
      `;
    }

    if (
      level ===
      "mudansha"
    ) {
      return `
        border-sky-800
        bg-sky-950/30
        text-sky-300
      `;
    }

    return `
      border-neutral-700
      bg-neutral-800
      text-neutral-300
    `;
  }

  /*
   * =====================================================
   * VIDEO EMBED
   * =====================================================
   */

  function getEmbedUrl(
    provider:
      | string
      | null,

    videoId:
      | string
      | null
  ) {
    if (
      !videoId
    ) {
      return null;
    }

    const normalized =
      provider
        ?.trim()
        .toLowerCase();

    if (
      normalized ===
        "youtube" ||
      normalized ===
        "yt"
    ) {
      return `https://www.youtube.com/embed/${encodeURIComponent(
        videoId
      )}`;
    }

    if (
      normalized ===
      "vimeo"
    ) {
      return `https://player.vimeo.com/video/${encodeURIComponent(
        videoId
      )}`;
    }

    return null;
  }

  /*
   * =====================================================
   * SELECTED CONTENT
   * =====================================================
   */

  const selectedIndex =
    content.findIndex(
      (
        item
      ) =>
        item.id ===
        selectedContentId
    );

  const selectedContent =
    selectedIndex >=
    0
      ? content[
          selectedIndex
        ]
      : null;

  const previousContent =
    selectedIndex >
    0
      ? content[
          selectedIndex - 1
        ]
      : null;

  const nextContent =
    selectedIndex >=
      0 &&
    selectedIndex <
      content.length - 1
      ? content[
          selectedIndex + 1
        ]
      : null;

  /*
   * =====================================================
   * OPEN CONTENT
   * =====================================================
   */

  function openContent(
    contentId:
      string
  ) {
    setSelectedContentId(
      contentId
    );

    router.replace(
      `/repository/${classId}/${rankId}/${tierId}?lesson=${encodeURIComponent(
        contentId
      )}`,
      {
        scroll:
          false,
      }
    );

    window.scrollTo({
      top:
        0,

      behavior:
        "smooth",
    });
  }

  /*
   * =====================================================
   * LOADING
   * =====================================================
   */

  if (
    loading
  ) {
    return (
      <div
        className="
          flex
          min-h-[60vh]
          items-center
          justify-center
        "
      >
        <div
          className="
            text-center
          "
        >
          <div
            className="
              mx-auto
              h-8
              w-8
              animate-spin
              rounded-full
              border-2
              border-neutral-700
              border-t-sky-400
            "
          />

          <p
            className="
              mt-4
              text-sm
              text-neutral-400
            "
          >
            Loading training
            content...
          </p>
        </div>
      </div>
    );
  }

  /*
   * =====================================================
   * ERROR
   * =====================================================
   */

  if (
    message
  ) {
    return (
      <main
        className="
          mx-auto
          w-full
          max-w-6xl
        "
      >
        <button
          type="button"

          onClick={() =>
            router.push(
              `/repository/${classId}`
            )
          }

          className="
            rounded-lg
            border
            border-neutral-700
            px-4
            py-2
            text-sm
            text-neutral-300
            transition
            hover:bg-neutral-800
          "
        >
          ← Back to Class
        </button>

        <section
          className="
            mt-6
            rounded-2xl
            border
            border-red-900
            bg-red-950/20
            p-8
          "
        >
          <p
            className="
              text-sm
              font-semibold
              uppercase
              tracking-[0.2em]
              text-red-400
            "
          >
            Repository
          </p>

          <h1
            className="
              mt-2
              text-2xl
              font-bold
            "
          >
            Content unavailable
          </h1>

          <p
            className="
              mt-3
              text-sm
              leading-6
              text-red-300
            "
          >
            {message}
          </p>
        </section>
      </main>
    );
  }

  /*
   * =====================================================
   * PAGE
   * =====================================================
   */

  return (
    <main
      className="
        mx-auto
        w-full
        max-w-6xl
      "
    >
      {/*
       * HEADER
       */}

      <header
        className="
          border-b
          border-neutral-800
          pb-7
        "
      >
        <div
          className="
            flex
            flex-col
            gap-5
            sm:flex-row
            sm:items-end
            sm:justify-between
          "
        >
          <div>
            <button
              type="button"

              onClick={() =>
                router.push(
                  `/repository/${classId}`
                )
              }

              className="
                mb-5
                text-sm
                font-medium
                text-neutral-400
                transition
                hover:text-white
              "
            >
              ← Back to Class
            </button>

            <p
              className="
                text-sm
                font-semibold
                uppercase
                tracking-[0.2em]
                text-sky-400
              "
            >
              Training Repository
            </p>

            <div
              className="
                mt-2
                flex
                flex-wrap
                items-center
                gap-3
              "
            >
              <h1
                className="
                  text-3xl
                  font-bold
                  tracking-tight
                  sm:text-4xl
                "
              >
                {rank?.name}
              </h1>

              {rank && (
                <span
                  className={`
                    rounded-full
                    border
                    px-3
                    py-1
                    text-xs
                    font-medium
                    ${levelBadgeClass(
                      rank.level
                    )}
                  `}
                >
                  {levelLabel(
                    rank.level
                  )}
                </span>
              )}
            </div>

            <p
              className="
                mt-2
                text-lg
                font-medium
                text-neutral-300
              "
            >
              {tier?.name}
            </p>
          </div>

          <button
            type="button"

            onClick={() =>
              router.push(
                `/repository/${classId}/search`
              )
            }

            className="
              self-start
              rounded-lg
              border
              border-sky-800
              bg-sky-950/20
              px-4
              py-2.5
              text-sm
              font-semibold
              text-sky-300
              transition
              hover:bg-sky-950/40
              sm:self-auto
            "
          >
            Search Training Content
          </button>
        </div>
      </header>

      {/*
       * REFERENCE LEVEL
       */}

      <section
        className="
          mt-8
          rounded-2xl
          border
          border-sky-900
          bg-sky-950/20
          p-6
        "
      >
        <p
          className="
            text-xs
            font-semibold
            uppercase
            tracking-[0.2em]
            text-sky-400
          "
        >
          Reference Level
        </p>

        <h2
          className="
            mt-2
            text-2xl
            font-bold
          "
        >
          {rank?.name}
          {" · "}
          {tier?.name}
        </h2>

        {rank?.level && (
          <p
            className="
              mt-2
              text-sm
              text-neutral-400
            "
          >
            {levelLabel(
              rank.level
            )}
          </p>
        )}
      </section>

      {/*
       * NO CONTENT
       */}

      {content.length ===
      0 ? (
        <section
          className="
            mt-10
          "
        >
          <div
            className="
              rounded-2xl
              border
              border-neutral-800
              bg-neutral-900
              p-10
              text-center
            "
          >
            <div
              className="
                mx-auto
                flex
                h-14
                w-14
                items-center
                justify-center
                rounded-2xl
                border
                border-neutral-800
                bg-neutral-950
                text-xl
                text-neutral-500
              "
            >
              ◇
            </div>

            <h2
              className="
                mt-5
                text-xl
                font-bold
              "
            >
              No training content
              yet
            </h2>

            <p
              className="
                mx-auto
                mt-2
                max-w-lg
                text-sm
                leading-6
                text-neutral-400
              "
            >
              Published content for
              this tier has not been
              added yet.
            </p>
          </div>
        </section>
      ) : selectedContent ? (
        <>
          {/*
           * SELECTED LESSON
           */}

          <section
            className="
              mt-10
            "
          >
            <div
              className="
                flex
                flex-col
                justify-between
                gap-4
                sm:flex-row
                sm:items-end
              "
            >
              <div>
                <p
                  className="
                    text-sm
                    font-semibold
                    uppercase
                    tracking-[0.2em]
                    text-sky-400
                  "
                >
                  Reference{" "}
                  {selectedIndex +
                    1}{" "}
                  of{" "}
                  {content.length}
                </p>

                <h2
                  className="
                    mt-2
                    text-3xl
                    font-bold
                    tracking-tight
                  "
                >
                  {
                    selectedContent.title
                  }
                </h2>
              </div>

              <span
                className="
                  self-start
                  rounded-full
                  border
                  border-green-800
                  bg-green-950/30
                  px-3
                  py-1
                  text-xs
                  font-medium
                  text-green-300
                "
              >
                Published
              </span>
            </div>

            {/*
             * VIDEO
             */}

            {(() => {
              const embedUrl =
                getEmbedUrl(
                  selectedContent.video_provider,
                  selectedContent.video_id
                );

              if (
                !embedUrl
              ) {
                return (
                  <div
                    className="
                      mt-6
                      rounded-2xl
                      border
                      border-neutral-800
                      bg-neutral-900
                      p-6
                    "
                  >
                    <p
                      className="
                        text-sm
                        text-neutral-500
                      "
                    >
                      No supported video
                      is attached to this
                      reference.
                    </p>
                  </div>
                );
              }

              return (
                <div
                  className="
                    mt-6
                    overflow-hidden
                    rounded-2xl
                    border
                    border-neutral-800
                    bg-black
                    shadow-2xl
                  "
                >
                  <div
                    className="
                      aspect-video
                    "
                  >
                    <iframe
                      src={
                        embedUrl
                      }

                      title={
                        selectedContent.title
                      }

                      className="
                        h-full
                        w-full
                      "

                      loading="lazy"

                      referrerPolicy="strict-origin-when-cross-origin"

                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"

                      allowFullScreen
                    />
                  </div>
                </div>
              );
            })()}

            {/*
             * DESCRIPTION
             */}

            {selectedContent.description && (
              <div
                className="
                  mt-6
                  rounded-2xl
                  border
                  border-neutral-800
                  bg-neutral-900
                  p-6
                "
              >
                <p
                  className="
                    text-xs
                    font-semibold
                    uppercase
                    tracking-[0.2em]
                    text-neutral-500
                  "
                >
                  Reference Notes
                </p>

                <p
                  className="
                    mt-3
                    whitespace-pre-line
                    text-sm
                    leading-7
                    text-neutral-300
                  "
                >
                  {
                    selectedContent.description
                  }
                </p>
              </div>
            )}

            {/*
             * PREVIOUS / NEXT
             */}

            <div
              className="
                mt-6
                grid
                gap-3
                sm:grid-cols-2
              "
            >
              <button
                type="button"

                disabled={
                  !previousContent
                }

                onClick={() => {
                  if (
                    previousContent
                  ) {
                    openContent(
                      previousContent.id
                    );
                  }
                }}

                className="
                  rounded-xl
                  border
                  border-neutral-700
                  bg-neutral-900
                  p-4
                  text-left
                  transition
                  hover:bg-neutral-800
                  disabled:cursor-not-allowed
                  disabled:opacity-40
                "
              >
                <p
                  className="
                    text-xs
                    uppercase
                    tracking-wider
                    text-neutral-500
                  "
                >
                  Previous
                </p>

                <p
                  className="
                    mt-1
                    font-semibold
                  "
                >
                  {previousContent
                    ? previousContent.title
                    : "No previous reference"}
                </p>
              </button>

              <button
                type="button"

                disabled={
                  !nextContent
                }

                onClick={() => {
                  if (
                    nextContent
                  ) {
                    openContent(
                      nextContent.id
                    );
                  }
                }}

                className="
                  rounded-xl
                  border
                  border-sky-800
                  bg-sky-950/20
                  p-4
                  text-left
                  transition
                  hover:bg-sky-950/40
                  disabled:cursor-not-allowed
                  disabled:border-neutral-700
                  disabled:bg-neutral-900
                  disabled:opacity-40
                "
              >
                <p
                  className="
                    text-xs
                    uppercase
                    tracking-wider
                    text-sky-400
                  "
                >
                  Next
                </p>

                <p
                  className="
                    mt-1
                    font-semibold
                  "
                >
                  {nextContent
                    ? nextContent.title
                    : "End of tier"}
                </p>
              </button>
            </div>
          </section>

          {/*
           * REFERENCE LIST
           */}

          <section
            className="
              mt-10
            "
          >
            <div
              className="
                flex
                flex-col
                gap-2
                sm:flex-row
                sm:items-end
                sm:justify-between
              "
            >
              <div>
                <p
                  className="
                    text-sm
                    font-semibold
                    uppercase
                    tracking-[0.2em]
                    text-sky-400
                  "
                >
                  References
                </p>

                <h2
                  className="
                    mt-1
                    text-2xl
                    font-bold
                  "
                >
                  {tier?.name} Content
                </h2>

                <p
                  className="
                    mt-2
                    text-sm
                    text-neutral-400
                  "
                >
                  Select any item
                  below to view it.
                </p>
              </div>

              <p
                className="
                  text-sm
                  text-neutral-500
                "
              >
                {content.length}{" "}
                {content.length ===
                1
                  ? "reference"
                  : "references"}
              </p>
            </div>

            <div
              className="
                mt-5
                space-y-3
              "
            >
              {content.map(
                (
                  item,
                  index
                ) => {
                  const active =
                    item.id ===
                    selectedContent.id;

                  return (
                    <button
                      type="button"

                      key={
                        item.id
                      }

                      onClick={() =>
                        openContent(
                          item.id
                        )
                      }

                      className={`
                        flex
                        w-full
                        items-center
                        gap-4
                        rounded-xl
                        border
                        p-4
                        text-left
                        transition
                        ${
                          active
                            ? `
                                border-sky-700
                                bg-sky-950/30
                              `
                            : `
                                border-neutral-800
                                bg-neutral-900
                                hover:border-neutral-700
                                hover:bg-neutral-800
                              `
                        }
                      `}
                    >
                      <div
                        className={`
                          flex
                          h-10
                          w-10
                          shrink-0
                          items-center
                          justify-center
                          rounded-full
                          font-bold
                          ${
                            active
                              ? `
                                  bg-sky-500
                                  text-white
                                `
                              : `
                                  bg-neutral-800
                                  text-neutral-400
                                `
                          }
                        `}
                      >
                        {index + 1}
                      </div>

                      <div
                        className="
                          min-w-0
                          flex-1
                        "
                      >
                        <p
                          className={`
                            font-semibold
                            ${
                              active
                                ? "text-sky-300"
                                : "text-white"
                            }
                          `}
                        >
                          {
                            item.title
                          }
                        </p>

                        {item.description && (
                          <p
                            className="
                              mt-1
                              truncate
                              text-xs
                              text-neutral-500
                            "
                          >
                            {
                              item.description
                            }
                          </p>
                        )}
                      </div>

                      {active ? (
                        <span
                          className="
                            rounded-full
                            border
                            border-sky-800
                            bg-sky-950/50
                            px-3
                            py-1
                            text-xs
                            text-sky-300
                          "
                        >
                          Viewing
                        </span>
                      ) : (
                        <span
                          className="
                            text-sky-400
                          "
                        >
                          →
                        </span>
                      )}
                    </button>
                  );
                }
              )}
            </div>
          </section>
        </>
      ) : null}

      {/*
       * ACCESS NOTE
       */}

      <section
        className="
          mt-10
          rounded-2xl
          border
          border-neutral-800
          bg-neutral-900/50
          p-5
        "
      >
        <p
          className="
            text-sm
            leading-6
            text-neutral-500
          "
        >
          Training materials shown
          here are published references
          for your class. Your current
          grade does not restrict access
          to published repository
          content.
        </p>
      </section>
    </main>
  );
}