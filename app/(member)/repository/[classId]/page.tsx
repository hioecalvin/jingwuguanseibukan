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

/*
 * ============================================================
 * TYPES
 * ============================================================
 */

type ClassItem = {
  id: string;
  name: string;
};

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

type MembershipProgress = {
  rank_id: string | null;
  sub_rank_id: string | null;
  status: string;
};

/*
 * ============================================================
 * PAGE
 * ============================================================
 */

export default function RepositoryClassPage() {
  const supabase = useMemo(
    () => createClient(),
    []
  );

  const router = useRouter();
  const params = useParams();

  const classId =
    typeof params.classId === "string"
      ? params.classId
      : "";

  /*
   * ==========================================================
   * DATA
   * ==========================================================
   */

  const [
    classItem,
    setClassItem,
  ] = useState<ClassItem | null>(
    null
  );

  const [
    ranks,
    setRanks,
  ] = useState<Rank[]>([]);

  const [
    tiers,
    setTiers,
  ] = useState<Tier[]>([]);

  const [
    membership,
    setMembership,
  ] =
    useState<MembershipProgress | null>(
      null
    );

  /*
   * ==========================================================
   * PAGE STATE
   * ==========================================================
   */

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    message,
    setMessage,
  ] = useState("");

  const [
    search,
    setSearch,
  ] = useState("");

  const [
    gradeFilter,
    setGradeFilter,
  ] = useState<
    "all" | "mudansha" | "yudansha"
  >("all");

  const [
    openRanks,
    setOpenRanks,
  ] = useState<
    Record<string, boolean>
  >({});

  /*
   * ==========================================================
   * LOAD REPOSITORY
   * ==========================================================
   */

  useEffect(() => {
    let active = true;

    async function loadRepository() {
      setLoading(true);
      setMessage("");

      if (!classId) {
        if (active) {
          setMessage(
            "Invalid class."
          );

          setLoading(false);
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
       * CHECK MEMBERSHIP
       */

      const {
        data:
          membershipData,
        error:
          membershipError,
      } =
        await supabase
          .from(
            "class_memberships"
          )
          .select(`
            rank_id,
            sub_rank_id,
            status
          `)
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
        if (active) {
          setMessage(
            membershipError.message
          );

          setLoading(false);
        }

        return;
      }

      if (
        !membershipData
      ) {
        if (active) {
          setMessage(
            "You are not enrolled in this class."
          );

          setLoading(false);
        }

        return;
      }

      /*
       * REPOSITORY ACCESS
       *
       * Active / Break 1 / Break 2:
       * allowed.
       *
       * Inactive:
       * denied.
       */

      if (
        ![
          "active",
          "break_1",
          "break_2",
        ].includes(
          membershipData.status
        )
      ) {
        if (active) {
          setMessage(
            "Your membership does not currently have repository access."
          );

          setLoading(false);
        }

        return;
      }

      /*
       * LOAD CLASS
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
        if (active) {
          setMessage(
            classError.message
          );

          setLoading(false);
        }

        return;
      }

      if (!classData) {
        if (active) {
          setMessage(
            "Class not found."
          );

          setLoading(false);
        }

        return;
      }

      /*
       * LOAD ALL RANKS
       *
       * IMPORTANT:
       * Member rank does NOT control
       * repository access.
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
        if (active) {
          setMessage(
            rankError.message
          );

          setLoading(false);
        }

        return;
      }

      const loadedRanks =
        (
          rankData ??
          []
        ) as Rank[];

      /*
       * LOAD TIERS
       */

      const rankIds =
        loadedRanks.map(
          (rank) =>
            rank.id
        );

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
          if (active) {
            setMessage(
              tierError.message
            );

            setLoading(false);
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
       * SAVE
       */

      if (!active) {
        return;
      }

      setClassItem(
        classData as ClassItem
      );

      setMembership(
        membershipData as MembershipProgress
      );

      setRanks(
        loadedRanks
      );

      setTiers(
        loadedTiers
      );

      /*
       * OPEN CURRENT RANK
       * BY DEFAULT
       */

      const initialOpenState:
        Record<
          string,
          boolean
        > = {};

      for (
        const rank
        of loadedRanks
      ) {
        initialOpenState[
          rank.id
        ] =
          rank.id ===
          membershipData.rank_id;
      }

      /*
       * NO CURRENT RANK:
       * OPEN FIRST RANK
       */

      if (
        !membershipData.rank_id &&
        loadedRanks.length >
          0
      ) {
        initialOpenState[
          loadedRanks[0].id
        ] = true;
      }

      setOpenRanks(
        initialOpenState
      );

      setLoading(
        false
      );
    }

    loadRepository();

    return () => {
      active = false;
    };
  }, [
    classId,
    router,
    supabase,
  ]);

  /*
   * ==========================================================
   * HELPERS
   * ==========================================================
   */

  function getTiersForRank(
    rankId: string
  ) {
    return tiers
      .filter(
        (tier) =>
          tier.rank_id ===
          rankId
      )
      .sort(
        (a, b) =>
          a.sort_order -
          b.sort_order
      );
  }

  function levelLabel(
    level:
      | "mudansha"
      | "yudansha"
      | null
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
      | "mudansha"
      | "yudansha"
      | null
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

  function toggleRank(
    rankId: string
  ) {
    setOpenRanks(
      (current) => ({
        ...current,

        [rankId]:
          !current[
            rankId
          ],
      })
    );
  }

  function openTier(
    rank: Rank,
    tier: Tier
  ) {
    router.push(
      `/repository/${classId}/${rank.id}/${tier.id}`
    );
  }

  /*
   * ==========================================================
   * CURRENT GRADE
   * ==========================================================
   */

  const currentRank =
    membership?.rank_id
      ? ranks.find(
          (rank) =>
            rank.id ===
            membership.rank_id
        ) ?? null
      : null;

  const currentTier =
    membership?.sub_rank_id
      ? tiers.find(
          (tier) =>
            tier.id ===
            membership.sub_rank_id
        ) ?? null
      : null;

  /*
   * ==========================================================
   * FILTER
   * ==========================================================
   */

  const filteredRanks =
    ranks.filter(
      (rank) => {
        /*
         * GRADE FILTER
         */

        if (
          gradeFilter !==
            "all" &&
          rank.level !==
            gradeFilter
        ) {
          return false;
        }

        /*
         * SEARCH
         */

        const query =
          search
            .trim()
            .toLowerCase();

        if (!query) {
          return true;
        }

        const rankMatches =
          rank.name
            .toLowerCase()
            .includes(
              query
            );

        const levelMatches =
          levelLabel(
            rank.level
          )
            .toLowerCase()
            .includes(
              query
            );

        const tierMatches =
          getTiersForRank(
            rank.id
          ).some(
            (tier) =>
              tier.name
                .toLowerCase()
                .includes(
                  query
                )
          );

        return (
          rankMatches ||
          levelMatches ||
          tierMatches
        );
      }
    );

  /*
   * ==========================================================
   * LOADING
   * ==========================================================
   */

  if (loading) {
    return (
      <div
        className="
          flex
          min-h-[60vh]
          items-center
          justify-center
        "
      >
        <div className="text-center">
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
            Loading repository...
          </p>
        </div>
      </div>
    );
  }

  /*
   * ==========================================================
   * ERROR / ACCESS DENIED
   * ==========================================================
   */

  if (message) {
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
              "/repository"
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
          ← Repository
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
            Repository unavailable
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
   * ==========================================================
   * PAGE
   * ==========================================================
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
                  "/repository"
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
              ← All Repositories
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
              Repository
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
              {classItem?.name}
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
              Full training reference
              repository for{" "}
              {classItem?.name}.
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
       * CURRENT PROGRESS
       */}

      <section
        className="
          mt-8
          overflow-hidden
          rounded-2xl
          border
          border-sky-900
          bg-sky-950/20
        "
      >
        <div className="p-6">
          <p
            className="
              text-xs
              font-semibold
              uppercase
              tracking-[0.2em]
              text-sky-400
            "
          >
            Your Current Grade
          </p>

          {currentRank ? (
            <div
              className="
                mt-4
                flex
                flex-col
                justify-between
                gap-5
                sm:flex-row
                sm:items-center
              "
            >
              <div>
                <div
                  className="
                    flex
                    flex-wrap
                    items-center
                    gap-3
                  "
                >
                  <h2
                    className="
                      text-2xl
                      font-bold
                    "
                  >
                    {currentRank.name}
                  </h2>

                  <span
                    className={`
                      rounded-full
                      border
                      px-3
                      py-1
                      text-xs
                      font-medium
                      ${levelBadgeClass(
                        currentRank.level
                      )}
                    `}
                  >
                    {levelLabel(
                      currentRank.level
                    )}
                  </span>
                </div>

                <p
                  className="
                    mt-2
                    text-neutral-300
                  "
                >
                  {currentTier?.name ??
                    "Tier not assigned"}
                </p>
              </div>

              <span
                className="
                  self-start
                  rounded-full
                  border
                  border-sky-800
                  bg-sky-950/50
                  px-4
                  py-2
                  text-sm
                  font-medium
                  text-sky-300
                "
              >
                Current Grade
              </span>
            </div>
          ) : (
            <div className="mt-4">
              <p className="font-medium">
                Rank not assigned yet.
              </p>

              <p
                className="
                  mt-2
                  text-sm
                  text-neutral-400
                "
              >
                You can still access the
                complete repository for
                this class.
              </p>
            </div>
          )}
        </div>

        <div
          className="
            border-t
            border-sky-900/60
            bg-neutral-950/20
            px-6
            py-4
          "
        >
          <p
            className="
              text-xs
              leading-5
              text-neutral-500
            "
          >
            Your current grade is shown
            for reference only. It does
            not restrict repository
            access.
          </p>
        </div>
      </section>

      {/*
       * SEARCH + FILTER
       */}

      <section
        className="
          mt-8
          rounded-2xl
          border
          border-neutral-800
          bg-neutral-900
          p-6
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
                tracking-[0.2em]
                text-sky-400
              "
            >
              Browse
            </p>

            <h2
              className="
                mt-1
                text-xl
                font-bold
              "
            >
              Find a Rank or Tier
            </h2>
          </div>

          <p
            className="
              text-sm
              text-neutral-500
            "
          >
            {filteredRanks.length} of{" "}
            {ranks.length} ranks
          </p>
        </div>

        <div
          className="
            mt-5
            grid
            gap-4
            md:grid-cols-[1fr_240px]
          "
        >
          <div>
            <label
              className="
                mb-2
                block
                text-sm
                font-medium
                text-neutral-300
              "
            >
              Rank / Tier
            </label>

            <input
              type="search"
              value={search}
              onChange={(
                event
              ) =>
                setSearch(
                  event.target.value
                )
              }
              placeholder="Example: 5th Kyu, Tier 2..."
              className="
                w-full
                rounded-lg
                border
                border-neutral-700
                bg-neutral-800
                px-4
                py-3
                text-white
                outline-none
                placeholder:text-neutral-500
                focus:border-sky-700
              "
            />
          </div>

          <div>
            <label
              className="
                mb-2
                block
                text-sm
                font-medium
                text-neutral-300
              "
            >
              Grade Group
            </label>

            <select
              value={
                gradeFilter
              }
              onChange={(
                event
              ) =>
                setGradeFilter(
                  event.target
                    .value as
                    | "all"
                    | "mudansha"
                    | "yudansha"
                )
              }
              className="
                w-full
                rounded-lg
                border
                border-neutral-700
                bg-neutral-800
                px-4
                py-3
                text-white
                outline-none
                focus:border-sky-700
              "
            >
              <option value="all">
                All Grades
              </option>

              <option value="mudansha">
                Mudansha (Kyu)
              </option>

              <option value="yudansha">
                Yudansha (Dan)
              </option>
            </select>
          </div>
        </div>

        {(search ||
          gradeFilter !==
            "all") && (
          <div
            className="
              mt-4
              flex
              justify-end
            "
          >
            <button
              type="button"
              onClick={() => {
                setSearch("");

                setGradeFilter(
                  "all"
                );
              }}
              className="
                text-sm
                font-medium
                text-sky-400
                transition
                hover:text-sky-300
              "
            >
              Clear filters
            </button>
          </div>
        )}

        <div
          className="
            mt-5
            border-t
            border-neutral-800
            pt-5
          "
        >
          <p
            className="
              text-sm
              text-neutral-400
            "
          >
            Looking for a specific
            technique, lesson or video?
          </p>

          <button
            type="button"
            onClick={() =>
              router.push(
                `/repository/${classId}/search`
              )
            }
            className="
              mt-3
              text-sm
              font-semibold
              text-sky-400
              transition
              hover:text-sky-300
            "
          >
            Search all training content →
          </button>
        </div>
      </section>

      {/*
       * TRAINING PATH
       */}

      <section className="mt-10">
        <div
          className="
            flex
            flex-col
            gap-3
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
              Training Path
            </p>

            <h2
              className="
                mt-1
                text-2xl
                font-bold
              "
            >
              All Ranks & Tiers
            </h2>

            <p
              className="
                mt-2
                max-w-3xl
                text-sm
                leading-6
                text-neutral-400
              "
            >
              Browse every published
              training level available
              for {classItem?.name}.
            </p>
          </div>
        </div>

        {/*
         * NO RANKS
         */}

        {ranks.length === 0 ? (
          <EmptyState
            title="No ranks configured"
            description="There are currently no ranks configured for this class."
          />
        ) : filteredRanks.length ===
          0 ? (
          <div
            className="
              mt-5
              rounded-2xl
              border
              border-neutral-800
              bg-neutral-900
              p-8
              text-center
            "
          >
            <h3
              className="
                text-lg
                font-semibold
              "
            >
              No matching ranks
            </h3>

            <p
              className="
                mt-2
                text-sm
                text-neutral-400
              "
            >
              Try another search or
              change the grade filter.
            </p>

            <button
              type="button"
              onClick={() => {
                setSearch("");

                setGradeFilter(
                  "all"
                );
              }}
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
              Clear Filters
            </button>
          </div>
        ) : (
          <div
            className="
              mt-5
              space-y-4
            "
          >
            {filteredRanks.map(
              (rank) => {
                const rankTiers =
                  getTiersForRank(
                    rank.id
                  );

                const isCurrentRank =
                  currentRank?.id ===
                  rank.id;

                /*
                 * While searching,
                 * matching ranks remain
                 * expanded.
                 */

                const isOpen =
                  search.trim()
                    ? true
                    : openRanks[
                        rank.id
                      ] ??
                      false;

                return (
                  <article
                    key={rank.id}
                    className={`
                      overflow-hidden
                      rounded-2xl
                      border
                      bg-neutral-900
                      ${
                        isCurrentRank
                          ? "border-sky-800"
                          : "border-neutral-800"
                      }
                    `}
                  >
                    {/*
                     * RANK HEADER
                     */}

                    <button
                      type="button"
                      onClick={() =>
                        toggleRank(
                          rank.id
                        )
                      }
                      className="
                        flex
                        w-full
                        items-center
                        justify-between
                        gap-4
                        p-6
                        text-left
                        transition
                        hover:bg-neutral-800/70
                      "
                    >
                      <div>
                        <div
                          className="
                            flex
                            flex-wrap
                            items-center
                            gap-3
                          "
                        >
                          <h3
                            className="
                              text-xl
                              font-bold
                              sm:text-2xl
                            "
                          >
                            {rank.name}
                          </h3>

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

                          {isCurrentRank && (
                            <span
                              className="
                                rounded-full
                                border
                                border-green-800
                                bg-green-950/30
                                px-3
                                py-1
                                text-xs
                                font-semibold
                                text-green-300
                              "
                            >
                              Current Rank
                            </span>
                          )}
                        </div>

                        <p
                          className="
                            mt-2
                            text-sm
                            text-neutral-500
                          "
                        >
                          {rankTiers.length}{" "}
                          {rankTiers.length ===
                          1
                            ? "tier"
                            : "tiers"}
                        </p>
                      </div>

                      <div
                        className="
                          flex
                          shrink-0
                          items-center
                          gap-3
                        "
                      >
                        <span
                          className="
                            hidden
                            rounded-full
                            border
                            border-green-800
                            bg-green-950/20
                            px-3
                            py-1
                            text-xs
                            font-medium
                            text-green-300
                            sm:inline-flex
                          "
                        >
                          Available
                        </span>

                        <span
                          className="
                            flex
                            h-9
                            w-9
                            items-center
                            justify-center
                            rounded-full
                            border
                            border-neutral-700
                            bg-neutral-800
                            text-lg
                            text-neutral-300
                          "
                        >
                          {isOpen
                            ? "−"
                            : "+"}
                        </span>
                      </div>
                    </button>

                    {/*
                     * TIERS
                     */}

                    {isOpen && (
                      <div
                        className="
                          border-t
                          border-neutral-800
                          p-6
                        "
                      >
                        {rankTiers.length ===
                        0 ? (
                          <div
                            className="
                              rounded-xl
                              border
                              border-neutral-800
                              bg-neutral-950/50
                              p-4
                            "
                          >
                            <p
                              className="
                                text-sm
                                text-neutral-500
                              "
                            >
                              No tiers
                              configured for
                              this rank.
                            </p>
                          </div>
                        ) : (
                          <div
                            className="
                              grid
                              gap-3
                              sm:grid-cols-2
                              lg:grid-cols-3
                            "
                          >
                            {rankTiers.map(
                              (
                                tier
                              ) => {
                                const isCurrentTier =
                                  isCurrentRank &&
                                  currentTier?.id ===
                                    tier.id;

                                return (
                                  <button
                                    type="button"
                                    key={
                                      tier.id
                                    }
                                    onClick={() =>
                                      openTier(
                                        rank,
                                        tier
                                      )
                                    }
                                    className={`
                                      group
                                      rounded-xl
                                      border
                                      p-4
                                      text-left
                                      transition
                                      ${
                                        isCurrentTier
                                          ? `
                                              border-sky-700
                                              bg-sky-950/30
                                              hover:bg-sky-950/50
                                            `
                                          : `
                                              border-neutral-700
                                              bg-neutral-800
                                              hover:border-sky-700
                                              hover:bg-neutral-700
                                            `
                                      }
                                    `}
                                  >
                                    <div
                                      className="
                                        flex
                                        items-start
                                        justify-between
                                        gap-3
                                      "
                                    >
                                      <div>
                                        <p
                                          className="
                                            font-semibold
                                            text-white
                                          "
                                        >
                                          {tier.name}
                                        </p>

                                        <p
                                          className="
                                            mt-1
                                            text-xs
                                            text-neutral-500
                                          "
                                        >
                                          Open training
                                          reference
                                        </p>
                                      </div>

                                      {isCurrentTier ? (
                                        <span
                                          className="
                                            rounded-full
                                            border
                                            border-sky-800
                                            bg-sky-950/50
                                            px-2
                                            py-1
                                            text-[10px]
                                            font-medium
                                            text-sky-300
                                          "
                                        >
                                          Current
                                        </span>
                                      ) : (
                                        <span
                                          className="
                                            text-lg
                                            text-sky-400
                                            transition-transform
                                            group-hover:translate-x-1
                                          "
                                        >
                                          →
                                        </span>
                                      )}
                                    </div>
                                  </button>
                                );
                              }
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </article>
                );
              }
            )}
          </div>
        )}
      </section>

      {/*
       * ACCESS INFO
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
          Repository access is based on
          your class membership. Your
          current rank and tier are
          displayed for reference and do
          not restrict which published
          training materials you can
          view.
        </p>
      </section>
    </main>
  );
}

/*
 * ============================================================
 * SMALL COMPONENTS
 * ============================================================
 */

function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div
      className="
        mt-5
        rounded-2xl
        border
        border-neutral-800
        bg-neutral-900
        p-8
        text-center
      "
    >
      <h3
        className="
          text-lg
          font-semibold
        "
      >
        {title}
      </h3>

      <p
        className="
          mt-2
          text-sm
          text-neutral-500
        "
      >
        {description}
      </p>
    </div>
  );
}