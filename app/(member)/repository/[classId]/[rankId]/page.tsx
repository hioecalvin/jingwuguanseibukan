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

type RankInfo = {
  id: string;
  name: string;

  level:
    | "mudansha"
    | "yudansha"
    | null;
};

type Tier = {
  id: string;
  name: string;
  sort_order: number;
};

export default function RankRepositoryPage() {
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

  const rankId =
    typeof params.rankId ===
    "string"
      ? params.rankId
      : "";

  const [
    classInfo,
    setClassInfo,
  ] =
    useState<ClassInfo | null>(
      null
    );

  const [
    rankInfo,
    setRankInfo,
  ] =
    useState<RankInfo | null>(
      null
    );

  const [
    tiers,
    setTiers,
  ] =
    useState<Tier[]>(
      []
    );

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
   * LOAD RANK REPOSITORY
   * =====================================================
   */

  useEffect(() => {
    let active =
      true;

    async function loadRankRepository() {
      setLoading(
        true
      );

      setMessage(
        ""
      );

      if (
        !classId ||
        !rankId
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
       * VERIFY CLASS MEMBERSHIP
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
            id,
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
        !membershipData
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
          membershipData.status
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
            name,
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
       * LOAD TIERS
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
            name,
            sort_order
          `)
          .eq(
            "rank_id",
            rankId
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

      if (
        active
      ) {
        setClassInfo(
          classData as ClassInfo
        );

        setRankInfo(
          rankData as RankInfo
        );

        setTiers(
          (
            tierData ??
            []
          ) as Tier[]
        );

        setLoading(
          false
        );
      }
    }

    loadRankRepository();

    return () => {
      active =
        false;
    };

  }, [
    classId,
    rankId,
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
      RankInfo["level"]
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
      RankInfo["level"]
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
            Loading tiers...
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
            Rank unavailable
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
          ← {classInfo?.name ??
            "Repository"}
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
          {classInfo?.name}
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
            {rankInfo?.name}
          </h1>

          {rankInfo && (
            <span
              className={`
                rounded-full
                border
                px-3
                py-1
                text-xs
                font-medium
                ${levelBadgeClass(
                  rankInfo.level
                )}
              `}
            >
              {levelLabel(
                rankInfo.level
              )}
            </span>
          )}
        </div>

        <p
          className="
            mt-2
            max-w-2xl
            text-sm
            leading-6
            text-neutral-400
          "
        >
          Select a tier to open
          the training materials
          for this rank.
        </p>
      </header>

      {/*
       * SUMMARY
       */}

      <section
        className="
          mt-8
          grid
          gap-4
          sm:grid-cols-3
        "
      >
        <SummaryCard
          label="Class"
          value={
            classInfo?.name ??
            "-"
          }
        />

        <SummaryCard
          label="Rank"
          value={
            rankInfo?.name ??
            "-"
          }
        />

        <SummaryCard
          label="Tiers"
          value={
            String(
              tiers.length
            )
          }
        />
      </section>

      {/*
       * NO TIERS
       */}

      {tiers.length ===
        0 && (
        <section
          className="
            mt-8
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
              font-semibold
            "
          >
            No tiers yet
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
            There are currently no
            tiers configured for this
            rank.
          </p>
        </section>
      )}

      {/*
       * TIERS
       */}

      {tiers.length >
        0 && (
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
                Training Path
              </p>

              <h2
                className="
                  mt-1
                  text-2xl
                  font-bold
                "
              >
                Select a Tier
              </h2>
            </div>

            <p
              className="
                text-sm
                text-neutral-500
              "
            >
              {tiers.length}{" "}
              {tiers.length === 1
                ? "tier"
                : "tiers"}
            </p>
          </div>

          <div
            className="
              mt-5
              grid
              gap-4
              md:grid-cols-2
              xl:grid-cols-3
            "
          >
            {tiers.map(
              (
                tier,
                index
              ) => (
                <button
                  key={
                    tier.id
                  }
                  type="button"
                  onClick={() =>
                    router.push(
                      `/repository/${classId}/${rankId}/${tier.id}`
                    )
                  }
                  className="
                    group
                    rounded-2xl
                    border
                    border-neutral-800
                    bg-neutral-900
                    p-6
                    text-left
                    transition
                    hover:border-sky-700
                    hover:bg-neutral-800/80
                  "
                >
                  <div
                    className="
                      flex
                      items-start
                      justify-between
                      gap-4
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
                        Tier{" "}
                        {index + 1}
                      </p>

                      <h3
                        className="
                          mt-2
                          text-2xl
                          font-bold
                        "
                      >
                        {tier.name}
                      </h3>
                    </div>

                    <span
                      className="
                        text-xl
                        text-sky-400
                        transition-transform
                        group-hover:translate-x-1
                      "
                    >
                      →
                    </span>
                  </div>

                  <p
                    className="
                      mt-4
                      text-sm
                      leading-6
                      text-neutral-400
                    "
                  >
                    Open the published
                    training materials
                    for {tier.name}.
                  </p>

                  <div
                    className="
                      mt-6
                      border-t
                      border-neutral-800
                      pt-5
                    "
                  >
                    <span
                      className="
                        text-sm
                        font-semibold
                        text-sky-400
                      "
                    >
                      Open Tier
                    </span>
                  </div>
                </button>
              )
            )}
          </div>
        </section>
      )}

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
          Repository access is based
          on your class membership.
          Your current grade does not
          restrict access to published
          tiers in this class.
        </p>
      </section>
    </main>
  );
}

/*
 * ============================================================
 * SMALL COMPONENT
 * ============================================================
 */

function SummaryCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div
      className="
        rounded-xl
        border
        border-neutral-800
        bg-neutral-900
        p-4
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
        {label}
      </p>

      <p
        className="
          mt-2
          text-lg
          font-semibold
          text-neutral-100
        "
      >
        {value}
      </p>
    </div>
  );
}