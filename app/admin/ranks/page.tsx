"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { exportToExcel } from "@/lib/exportExcel";

type ClassItem = {
  id: string;
  name: string;
  is_active: boolean;
};

type Rank = {
  id: string;
  class_id: string;
  name: string;
  sort_order: number;
};

type Profile = {
  is_super_admin: boolean;
};

export default function RankManagementPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [ranks, setRanks] = useState<Rank[]>([]);

  const [rankName, setRankName] = useState("");
  const [sortOrder, setSortOrder] = useState(1);

  const [loading, setLoading] = useState(true);
  const [loadingRanks, setLoadingRanks] = useState(false);
  const [processing, setProcessing] = useState(false);

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<
    "success" | "error" | ""
  >("");

  /*
   * ============================================================
   * SELECTED CLASS
   * ============================================================
   */

  const selectedClass = useMemo(
    () =>
      classes.find(
        (classItem) => classItem.id === selectedClassId
      ) ?? null,
    [classes, selectedClassId]
  );

  /*
   * ============================================================
   * LOAD CLASSES
   * ============================================================
   */

  useEffect(() => {
    let active = true;

    async function loadPage() {
      setLoading(true);

      /*
       * Authentication
       */

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        router.replace("/login");
        return;
      }

      /*
       * Super Admin check
       *
       * Rank structure affects grading, certificates and repository
       * progression, so this page is restricted to Super Admin.
       */

      const { data: profileData, error: profileError } =
        await supabase
          .from("profiles")
          .select("is_super_admin")
          .eq("id", user.id)
          .single();

      if (profileError || !profileData) {
        router.replace("/admin");
        return;
      }

      const profile = profileData as Profile;

      if (!profile.is_super_admin) {
        router.replace("/admin");
        return;
      }

      /*
       * Active classes
       *
       * IMPORTANT:
       * classes uses is_active, not active.
       */

      const { data, error } = await supabase
        .from("classes")
        .select(`
          id,
          name,
          is_active
        `)
        .eq("is_active", true)
        .order("name", {
          ascending: true,
        });

      if (!active) {
        return;
      }

      if (error) {
        setMessage(error.message);
        setMessageType("error");
        setLoading(false);
        return;
      }

      const loadedClasses = (data ?? []) as ClassItem[];

      setClasses(loadedClasses);

      if (loadedClasses.length > 0) {
        setSelectedClassId(loadedClasses[0].id);
      }

      setLoading(false);
    }

    loadPage();

    return () => {
      active = false;
    };
  }, [router, supabase]);

  /*
   * ============================================================
   * LOAD RANKS
   * ============================================================
   */

  const loadRanks = useCallback(async () => {
    if (!selectedClassId) {
      setRanks([]);
      return;
    }

    setLoadingRanks(true);

    const { data, error } = await supabase
      .from("ranks")
      .select(`
        id,
        class_id,
        name,
        sort_order
      `)
      .eq("class_id", selectedClassId)
      .order("sort_order", {
        ascending: true,
      })
      .order("name", {
        ascending: true,
      });

    if (error) {
      setMessage(error.message);
      setMessageType("error");
      setLoadingRanks(false);
      return;
    }

    const loadedRanks = (data ?? []) as Rank[];

    setRanks(loadedRanks);

    /*
     * Automatically suggest the next sort order.
     */

    if (loadedRanks.length === 0) {
      setSortOrder(1);
    } else {
      const highestSortOrder = Math.max(
        ...loadedRanks.map((rank) => rank.sort_order)
      );

      setSortOrder(highestSortOrder + 1);
    }

    setLoadingRanks(false);
  }, [selectedClassId, supabase]);

  useEffect(() => {
    loadRanks();
  }, [loadRanks]);

  /*
   * ============================================================
   * ADD RANK
   * ============================================================
   */

  async function addRank(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const cleanedName = rankName.trim();

    if (!selectedClassId) {
      setMessage("Select a class first.");
      setMessageType("error");
      return;
    }

    if (!cleanedName) {
      setMessage("Enter a rank name.");
      setMessageType("error");
      return;
    }

    if (!Number.isFinite(sortOrder)) {
      setMessage("Enter a valid sort order.");
      setMessageType("error");
      return;
    }

    const duplicateName = ranks.some(
      (rank) =>
        rank.name.trim().toLowerCase() ===
        cleanedName.toLowerCase()
    );

    if (duplicateName) {
      setMessage(
        `"${cleanedName}" already exists in ${
          selectedClass?.name ?? "this class"
        }.`
      );

      setMessageType("error");
      return;
    }

    setProcessing(true);
    setMessage("");
    setMessageType("");

    try {
      const { data, error } = await supabase
        .from("ranks")
        .insert({
          class_id: selectedClassId,
          name: cleanedName,
          sort_order: sortOrder,
        })
        .select(`
          id,
          class_id,
          name,
          sort_order
        `)
        .single();

      if (error) {
        throw error;
      }

      const newRank = data as Rank;

      const updatedRanks = [...ranks, newRank].sort(
        (a, b) =>
          a.sort_order - b.sort_order ||
          a.name.localeCompare(b.name)
      );

      setRanks(updatedRanks);

      setRankName("");

      const highestSortOrder = Math.max(
        ...updatedRanks.map((rank) => rank.sort_order)
      );

      setSortOrder(highestSortOrder + 1);

      setMessage(`${cleanedName} was added successfully.`);
      setMessageType("success");
    } catch (error: unknown) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Failed to create rank."
      );

      setMessageType("error");
    } finally {
      setProcessing(false);
    }
  }

  /*
   * ============================================================
   * EXCEL
   * ============================================================
   */

  function exportRanksExcel() {
    if (!selectedClass) {
      setMessage("Select a class first.");
      setMessageType("error");
      return;
    }

    if (ranks.length === 0) {
      setMessage("There are no ranks to export.");
      setMessageType("error");
      return;
    }

    exportToExcel({
      filename: `${selectedClass.name}-Ranks`,
      sheetName: "Ranks",
      title: `${selectedClass.name} Ranks`,

      columns: [
        {
          header: "Class",
          key: "class_name",
          value: () => selectedClass.name,
        },
        {
          header: "Rank",
          key: "name",
        },
        {
          header: "Sort Order",
          key: "sort_order",
        },
      ],

      data: ranks,
    });
  }

  /*
   * ============================================================
   * LOADING
   * ============================================================
   */

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
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
              border-t-red-400
            "
          />

          <p className="mt-4 text-sm text-neutral-400">
            Loading rank management...
          </p>
        </div>
      </div>
    );
  }

  /*
   * ============================================================
   * PAGE
   * ============================================================
   */

  return (
    <main className="mx-auto w-full max-w-7xl">
      {/* HEADER */}

      <header className="border-b border-neutral-800 pb-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p
              className="
                text-sm
                font-semibold
                uppercase
                tracking-[0.2em]
                text-red-400
              "
            >
              Super Administration
            </p>

            <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
              Rank Management
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-400">
              Manage the rank progression used for grading,
              certificates and repository organisation.
            </p>
          </div>

          <button
            type="button"
            disabled={!selectedClass || ranks.length === 0}
            onClick={exportRanksExcel}
            className="
              self-start
              rounded-lg
              border
              border-green-800
              bg-green-950/20
              px-5
              py-2.5
              text-sm
              font-semibold
              text-green-300
              transition
              hover:bg-green-950/40
              disabled:cursor-not-allowed
              disabled:opacity-40
              sm:self-auto
            "
          >
            Export Excel
          </button>
        </div>
      </header>

      {/* MESSAGE */}

      {message && (
        <div
          className={`
            mt-6
            rounded-xl
            border
            p-4
            text-sm

            ${
              messageType === "success"
                ? `
                    border-green-900
                    bg-green-950/30
                    text-green-300
                  `
                : `
                    border-red-900
                    bg-red-950/30
                    text-red-300
                  `
            }
          `}
        >
          {message}
        </div>
      )}

      {/* CLASS SELECTOR */}

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
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div className="w-full max-w-lg">
            <label
              htmlFor="rank-class"
              className="
                block
                text-xs
                font-semibold
                uppercase
                tracking-[0.15em]
                text-neutral-500
              "
            >
              Class
            </label>

            <select
              id="rank-class"
              value={selectedClassId}
              onChange={(event) => {
                setSelectedClassId(event.target.value);
                setMessage("");
                setMessageType("");
              }}
              className="
                mt-2
                w-full
                rounded-lg
                border
                border-neutral-700
                bg-neutral-800
                px-4
                py-3
                text-white
                outline-none
                focus:border-sky-600
              "
            >
              {classes.length === 0 && (
                <option value="">
                  No active classes available
                </option>
              )}

              {classes.map((classItem) => (
                <option
                  key={classItem.id}
                  value={classItem.id}
                >
                  {classItem.name}
                </option>
              ))}
            </select>
          </div>

          {selectedClass && (
            <div className="text-sm text-neutral-500">
              <span className="font-semibold text-white">
                {ranks.length}
              </span>{" "}
              {ranks.length === 1 ? "rank" : "ranks"} configured
            </div>
          )}
        </div>
      </section>

      {/* ADD RANK */}

      {selectedClass && (
        <section
          className="
            mt-6
            rounded-2xl
            border
            border-sky-900
            bg-sky-950/10
            p-6
          "
        >
          <p
            className="
              text-xs
              font-semibold
              uppercase
              tracking-[0.15em]
              text-sky-400
            "
          >
            {selectedClass.name}
          </p>

          <h2 className="mt-1 text-2xl font-bold">
            Add Rank
          </h2>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-400">
            Add a rank to the progression. Sort order controls where
            the rank appears in the repository and administrative
            interfaces.
          </p>

          <form
            onSubmit={addRank}
            className="
              mt-5
              grid
              gap-4
              lg:grid-cols-[minmax(0,1fr)_180px_auto]
              lg:items-end
            "
          >
            <div>
              <label
                htmlFor="rank-name"
                className="
                  block
                  text-xs
                  font-semibold
                  uppercase
                  tracking-wider
                  text-neutral-500
                "
              >
                Rank Name
              </label>

              <input
                id="rank-name"
                type="text"
                value={rankName}
                onChange={(event) =>
                  setRankName(event.target.value)
                }
                placeholder="Example: 5th Kyu"
                maxLength={100}
                required
                className="
                  mt-2
                  w-full
                  rounded-lg
                  border
                  border-neutral-700
                  bg-neutral-800
                  px-4
                  py-3
                  text-white
                  outline-none
                  placeholder:text-neutral-600
                  focus:border-sky-600
                "
              />
            </div>

            <div>
              <label
                htmlFor="rank-sort-order"
                className="
                  block
                  text-xs
                  font-semibold
                  uppercase
                  tracking-wider
                  text-neutral-500
                "
              >
                Sort Order
              </label>

              <input
                id="rank-sort-order"
                type="number"
                value={sortOrder}
                onChange={(event) =>
                  setSortOrder(Number(event.target.value))
                }
                className="
                  mt-2
                  w-full
                  rounded-lg
                  border
                  border-neutral-700
                  bg-neutral-800
                  px-4
                  py-3
                  text-white
                  outline-none
                  focus:border-sky-600
                "
              />
            </div>

            <button
              type="submit"
              disabled={processing}
              className="
                rounded-lg
                bg-sky-500
                px-6
                py-3
                font-semibold
                text-white
                transition
                hover:bg-sky-400
                disabled:cursor-not-allowed
                disabled:opacity-50
              "
            >
              {processing ? "Adding..." : "Add Rank"}
            </button>
          </form>
        </section>
      )}

      {/* EXISTING RANKS */}

      <section className="mt-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
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
              Progression
            </p>

            <h2 className="mt-1 text-2xl font-bold">
              {selectedClass
                ? `${selectedClass.name} Ranks`
                : "Existing Ranks"}
            </h2>

            <p className="mt-2 text-sm text-neutral-500">
              Lower sort numbers appear first.
            </p>
          </div>

          {selectedClass && ranks.length > 0 && (
            <span
              className="
                self-start
                rounded-full
                border
                border-neutral-700
                bg-neutral-900
                px-3
                py-1
                text-xs
                text-neutral-400
                sm:self-auto
              "
            >
              {ranks.length}{" "}
              {ranks.length === 1 ? "Rank" : "Ranks"}
            </span>
          )}
        </div>

        {loadingRanks ? (
          <div
            className="
              mt-5
              rounded-2xl
              border
              border-neutral-800
              bg-neutral-900
              p-10
              text-center
            "
          >
            <p className="text-sm text-neutral-400">
              Loading ranks...
            </p>
          </div>
        ) : ranks.length === 0 ? (
          <div
            className="
              mt-5
              rounded-2xl
              border
              border-neutral-800
              bg-neutral-900
              p-10
              text-center
            "
          >
            <h3 className="text-lg font-semibold">
              No ranks configured
            </h3>

            <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-neutral-500">
              {selectedClass
                ? `${selectedClass.name} does not have any ranks yet.`
                : "Select a class to manage its ranks."}
            </p>
          </div>
        ) : (
          <div className="mt-5 overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900">
            <div
              className="
                hidden
                grid-cols-[90px_minmax(0,1fr)_160px]
                gap-4
                border-b
                border-neutral-800
                bg-neutral-950/50
                px-5
                py-3
                text-xs
                font-semibold
                uppercase
                tracking-wider
                text-neutral-500
                md:grid
              "
            >
              <div>Order</div>
              <div>Rank</div>
              <div>Status</div>
            </div>

            {ranks.map((rank, index) => (
              <div
                key={rank.id}
                className={`
                  grid
                  gap-4
                  px-5
                  py-5
                  md:grid-cols-[90px_minmax(0,1fr)_160px]
                  md:items-center

                  ${
                    index !== ranks.length - 1
                      ? "border-b border-neutral-800"
                      : ""
                  }
                `}
              >
                <div>
                  <p className="text-xs uppercase tracking-wider text-neutral-500 md:hidden">
                    Order
                  </p>

                  <span
                    className="
                      mt-1
                      inline-flex
                      min-w-10
                      justify-center
                      rounded-lg
                      border
                      border-neutral-700
                      bg-neutral-950
                      px-3
                      py-2
                      text-sm
                      font-bold
                      text-neutral-300
                      md:mt-0
                    "
                  >
                    {rank.sort_order}
                  </span>
                </div>

                <div>
                  <p className="text-xs uppercase tracking-wider text-neutral-500 md:hidden">
                    Rank
                  </p>

                  <p className="mt-1 text-lg font-semibold text-white md:mt-0">
                    {rank.name}
                  </p>
                </div>

                <div>
                  <p className="text-xs uppercase tracking-wider text-neutral-500 md:hidden">
                    Record Protection
                  </p>

                  <span
                    className="
                      mt-1
                      inline-flex
                      rounded-full
                      border
                      border-green-900
                      bg-green-950/30
                      px-3
                      py-1
                      text-xs
                      font-semibold
                      text-green-300
                      md:mt-0
                    "
                  >
                    Active
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* SAFETY */}

      <section
        className="
          mt-10
          rounded-2xl
          border
          border-amber-900/60
          bg-amber-950/10
          p-5
        "
      >
        <p
          className="
            text-xs
            font-semibold
            uppercase
            tracking-[0.15em]
            text-amber-400
          "
        >
          Record Protection
        </p>

        <p className="mt-2 text-sm leading-6 text-neutral-400">
          Rank deletion is intentionally not exposed on this screen.
          Ranks may be referenced by Member grading history,
          certificates, repository content and archived records.
          Historical records should remain preserved.
        </p>
      </section>
    </main>
  );
}