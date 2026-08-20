"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useParams,
  useRouter,
} from "next/navigation";

import {
  createClient,
} from "@/lib/supabase/client";

type ClassInfo = {
  id: string;
  name: string;
};

type Rank = {
  id: string;
  name: string;
};

type Tier = {
  id: string;
  rank_id: string;
  name: string;
};

type ContentItem = {
  id: string;
  class_id: string;
  rank_id: string;
  sub_rank_id: string;

  title: string;

  description:
    | string
    | null;

  sort_order: number;
};

export default function RepositorySearchPage() {
  const supabase =
    useMemo(
      () => createClient(),
      []
    );

  const router =
    useRouter();

  const params =
    useParams();

  const classId =
    typeof params.classId ===
    "string"
      ? params.classId
      : "";

  const [
    classInfo,
    setClassInfo,
  ] =
    useState<ClassInfo | null>(
      null
    );

  const [
    ranks,
    setRanks,
  ] =
    useState<Rank[]>(
      []
    );

  const [
    tiers,
    setTiers,
  ] =
    useState<Tier[]>(
      []
    );

  const [
    content,
    setContent,
  ] =
    useState<ContentItem[]>(
      []
    );

  const [
    search,
    setSearch,
  ] =
    useState("");

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
   * LOAD SEARCH DATA
   * =====================================================
   */

  useEffect(() => {
    let active =
      true;

    async function loadSearch() {
      setLoading(
        true
      );

      setMessage(
        ""
      );

      if (
        !classId
      ) {
        if (
          active
        ) {
          setMessage(
            "Invalid class."
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
       * CLASS MEMBERSHIP ACCESS
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
       * CLASS INFORMATION
       */

      const {
        data:
          classData,

        error:
          classError,
      } =
        await supabase
          .from(
            "classes"
          )
          .select(`
            id,
            name
          `)
          .eq(
            "id",
            classId
          )
          .maybeSingle();

      if (
        classError
      ) {
        if (
          active
        ) {
          setMessage(
            classError.message
          );

          setLoading(
            false
          );
        }

        return;
      }

      if (
        !classData
      ) {
        if (
          active
        ) {
          setMessage(
            "Class not found."
          );

          setLoading(
            false
          );
        }

        return;
      }

      /*
       * RANKS
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
            name,
            sort_order
          `)
          .eq(
            "class_id",
            classId
          )
          .order(
            "sort_order",
            {
              ascending:
                true,
            }
          );

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

      const loadedRanks =
        (
          rankData ??
          []
        ) as Rank[];

      const rankIds =
        loadedRanks.map(
          (
            rank
          ) =>
            rank.id
        );

      /*
       * TIERS
       */

      let loadedTiers:
        Tier[] = [];

      if (
        rankIds.length >
        0
      ) {
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
            .in(
              "rank_id",
              rankIds
            )
            .order(
              "sort_order",
              {
                ascending:
                  true,
              }
            );

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

        loadedTiers =
          (
            tierData ??
            []
          ) as Tier[];
      }

      /*
       * PUBLISHED CONTENT
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
            class_id,
            rank_id,
            sub_rank_id,
            title,
            description,
            sort_order
          `)
          .eq(
            "class_id",
            classId
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

      if (
        active
      ) {
        setClassInfo(
          classData as ClassInfo
        );

        setRanks(
          loadedRanks
        );

        setTiers(
          loadedTiers
        );

        setContent(
          (
            contentData ??
            []
          ) as ContentItem[]
        );

        setLoading(
          false
        );
      }
    }

    loadSearch();

    return () => {
      active =
        false;
    };

  }, [
    classId,
    router,
    supabase,
  ]);

  /*
   * =====================================================
   * LOOKUPS
   * =====================================================
   */

  const rankMap =
    useMemo(
      () =>
        new Map(
          ranks.map(
            (
              rank
            ) => [
              rank.id,
              rank,
            ]
          )
        ),
      [
        ranks,
      ]
    );

  const tierMap =
    useMemo(
      () =>
        new Map(
          tiers.map(
            (
              tier
            ) => [
              tier.id,
              tier,
            ]
          )
        ),
      [
        tiers,
      ]
    );

  function getRank(
    rankId: string
  ) {
    return rankMap.get(
      rankId
    );
  }

  function getTier(
    tierId: string
  ) {
    return tierMap.get(
      tierId
    );
  }

  /*
   * =====================================================
   * SEARCH
   * =====================================================
   */

  const results =
    useMemo(
      () => {
        const query =
          search
            .trim()
            .toLowerCase();

        if (
          !query
        ) {
          return [];
        }

        /*
         * Support multiple words.
         *
         * Example:
         *
         * shomen uchi ikkyo
         *
         * All words must appear somewhere
         * in title/description/rank/tier.
         */

        const words =
          query
            .split(
              /\s+/
            )
            .filter(
              Boolean
            );

        return content.filter(
          (
            item
          ) => {
            const rank =
              rankMap.get(
                item.rank_id
              );

            const tier =
              tierMap.get(
                item.sub_rank_id
              );

            const searchableText =
              [
                item.title,
                item.description ??
                  "",
                rank?.name ??
                  "",
                tier?.name ??
                  "",
              ]
                .join(
                  " "
                )
                .toLowerCase();

            return words.every(
              (
                word
              ) =>
                searchableText.includes(
                  word
                )
            );
          }
        );
      },

      [
        search,
        content,
        rankMap,
        tierMap,
      ]
    );

  /*
   * =====================================================
   * OPEN RESULT
   * =====================================================
   */

  function openResult(
    item:
      ContentItem
  ) {
    router.push(
      `/repository/${classId}/${item.rank_id}/${item.sub_rank_id}?lesson=${encodeURIComponent(
        item.id
      )}`
    );
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
            Loading repository
            search...
          </p>
        </div>
      </div>
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
          ←{" "}
          {classInfo?.name ??
            "Back to Class"}
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
          Repository Search
        </p>

        <h1
          className="
            mt-2
            text-3xl
            font-bold
            tracking-tight
            sm:text-4xl
          "
        >
          Search Training Material
        </h1>

        <p
          className="
            mt-2
            max-w-2xl
            text-sm
            leading-6
            text-neutral-400
          "
        >
          Search all published
          training references in{" "}
          {classInfo?.name ??
            "this class"} by technique,
          title, rank or tier.
        </p>
      </header>

      {/*
       * ERROR
       */}

      {message ? (
        <section
          className="
            mt-8
            rounded-2xl
            border
            border-red-900
            bg-red-950/20
            p-6
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

          <h2
            className="
              mt-2
              text-xl
              font-bold
            "
          >
            Search unavailable
          </h2>

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
      ) : (
        <>
          {/*
           * SEARCH FIELD
           */}

          <section
            className="
              mt-8
              rounded-2xl
              border
              border-neutral-800
              bg-neutral-900
              p-5
              sm:p-6
            "
          >
            <label
              htmlFor="repository-search"
              className="
                text-xs
                font-semibold
                uppercase
                tracking-[0.15em]
                text-neutral-500
              "
            >
              Search
            </label>

            <div
              className="
                mt-3
                flex
                gap-3
              "
            >
              <input
                id="repository-search"

                type="search"

                value={
                  search
                }

                onChange={(
                  event
                ) =>
                  setSearch(
                    event.target.value
                  )
                }

                autoFocus

                placeholder="Technique, rank, tier..."

                className="
                  min-w-0
                  flex-1
                  rounded-xl
                  border
                  border-neutral-700
                  bg-neutral-950
                  px-5
                  py-4
                  text-base
                  text-white
                  outline-none
                  placeholder:text-neutral-600
                  focus:border-sky-600
                  sm:text-lg
                "
              />

              {search && (
                <button
                  type="button"

                  onClick={() =>
                    setSearch(
                      ""
                    )
                  }

                  className="
                    shrink-0
                    rounded-xl
                    border
                    border-neutral-700
                    px-4
                    text-sm
                    text-neutral-400
                    transition
                    hover:bg-neutral-800
                    hover:text-white
                  "
                >
                  Clear
                </button>
              )}
            </div>

            <p
              className="
                mt-3
                text-xs
                leading-5
                text-neutral-500
              "
            >
              Example: Ikkyo,
              Shomen Uchi,
              5th Kyu or Tier 1.
              You can also combine
              multiple words.
            </p>
          </section>

          {/*
           * START STATE
           */}

          {!search.trim() ? (
            <section
              className="
                mt-6
                rounded-2xl
                border
                border-neutral-800
                bg-neutral-900/60
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
                  rounded-full
                  border
                  border-neutral-800
                  bg-neutral-950
                  text-2xl
                  text-neutral-500
                "
              >
                ⌕
              </div>

              <h2
                className="
                  mt-5
                  text-xl
                  font-semibold
                "
              >
                Search the repository
              </h2>

              <p
                className="
                  mx-auto
                  mt-2
                  max-w-lg
                  text-sm
                  leading-6
                  text-neutral-500
                "
              >
                Start typing above to
                search all published
                training references in
                this class.
              </p>
            </section>
          ) : results.length ===
            0 ? (
            <section
              className="
                mt-6
                rounded-2xl
                border
                border-neutral-800
                bg-neutral-900
                p-10
                text-center
              "
            >
              <h2
                className="
                  text-xl
                  font-semibold
                "
              >
                No results found
              </h2>

              <p
                className="
                  mt-2
                  text-sm
                  text-neutral-500
                "
              >
                Try another technique,
                rank or tier.
              </p>

              <button
                type="button"

                onClick={() =>
                  setSearch(
                    ""
                  )
                }

                className="
                  mt-5
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
                Clear Search
              </button>
            </section>
          ) : (
            <section
              className="
                mt-8
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
                      text-xs
                      font-semibold
                      uppercase
                      tracking-[0.15em]
                      text-sky-400
                    "
                  >
                    Results
                  </p>

                  <h2
                    className="
                      mt-1
                      text-2xl
                      font-bold
                    "
                  >
                    Matching Content
                  </h2>
                </div>

                <p
                  className="
                    text-sm
                    text-neutral-500
                  "
                >
                  {results.length}{" "}
                  {results.length ===
                  1
                    ? "result"
                    : "results"}
                </p>
              </div>

              <div
                className="
                  mt-5
                  space-y-3
                "
              >
                {results.map(
                  (
                    item
                  ) => {
                    const rank =
                      getRank(
                        item.rank_id
                      );

                    const tier =
                      getTier(
                        item.sub_rank_id
                      );

                    return (
                      <button
                        key={
                          item.id
                        }

                        type="button"

                        onClick={() =>
                          openResult(
                            item
                          )
                        }

                        className="
                          group
                          w-full
                          rounded-2xl
                          border
                          border-neutral-800
                          bg-neutral-900
                          p-5
                          text-left
                          transition
                          hover:border-sky-800
                          hover:bg-neutral-800/80
                        "
                      >
                        <div
                          className="
                            flex
                            items-start
                            justify-between
                            gap-5
                          "
                        >
                          <div
                            className="
                              min-w-0
                              flex-1
                            "
                          >
                            <h3
                              className="
                                text-lg
                                font-semibold
                                text-white
                              "
                            >
                              {
                                item.title
                              }
                            </h3>

                            <div
                              className="
                                mt-2
                                flex
                                flex-wrap
                                gap-2
                              "
                            >
                              <span
                                className="
                                  rounded-full
                                  border
                                  border-sky-800
                                  bg-sky-950/20
                                  px-3
                                  py-1
                                  text-xs
                                  text-sky-300
                                "
                              >
                                {rank
                                  ?.name ??
                                  "Unknown Rank"}
                              </span>

                              <span
                                className="
                                  rounded-full
                                  border
                                  border-neutral-700
                                  bg-neutral-800
                                  px-3
                                  py-1
                                  text-xs
                                  text-neutral-300
                                "
                              >
                                {tier
                                  ?.name ??
                                  "Unknown Tier"}
                              </span>
                            </div>

                            {item.description && (
                              <p
                                className="
                                  mt-3
                                  line-clamp-2
                                  text-sm
                                  leading-6
                                  text-neutral-400
                                "
                              >
                                {
                                  item.description
                                }
                              </p>
                            )}
                          </div>

                          <span
                            className="
                              shrink-0
                              text-xl
                              text-sky-400
                              transition-transform
                              group-hover:translate-x-1
                            "
                          >
                            →
                          </span>
                        </div>
                      </button>
                    );
                  }
                )}
              </div>
            </section>
          )}
        </>
      )}

      {/*
       * ACCESS NOTE
       */}

      {!message && (
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
            Search only returns
            published training content
            for this class. Repository
            access remains based on your
            class membership rather than
            your current rank.
          </p>
        </section>
      )}
    </main>
  );
}