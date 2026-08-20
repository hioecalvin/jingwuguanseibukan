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

type Tier = {
  id: string;
  rank_id: string;
  name: string;
  sort_order: number;
};

type Profile = {
  is_super_admin: boolean;
};

export default function TierManagementPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [ranks, setRanks] = useState<Rank[]>([]);
  const [tiers, setTiers] = useState<Tier[]>([]);

  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedRankId, setSelectedRankId] = useState("");

  const [tierName, setTierName] = useState("");
  const [sortOrder, setSortOrder] = useState(1);

  const [loading, setLoading] = useState(true);
  const [loadingRanks, setLoadingRanks] = useState(false);
  const [loadingTiers, setLoadingTiers] = useState(false);
  const [processing, setProcessing] = useState(false);

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<
    "success" | "error" | ""
  >("");

  /*
   * ============================================================
   * SELECTED VALUES
   * ============================================================
   */

  const selectedClass = useMemo(
    () =>
      classes.find(
        (classItem) => classItem.id === selectedClassId
      ) ?? null,
    [classes, selectedClassId]
  );

  const selectedRank = useMemo(
    () =>
      ranks.find(
        (rank) => rank.id === selectedRankId
      ) ?? null,
    [ranks, selectedRankId]
  );

  /*
   * ============================================================
   * LOAD PAGE
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
       * Super Admin protection
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
       * Load active classes.
       *
       * classes uses is_active.
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
      setSelectedRankId("");
      setTiers([]);
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
      setRanks([]);
      setSelectedRankId("");
      setLoadingRanks(false);
      return;
    }

    const loadedRanks = (data ?? []) as Rank[];

    setRanks(loadedRanks);

    if (loadedRanks.length > 0) {
      setSelectedRankId(loadedRanks[0].id);
    } else {
      setSelectedRankId("");
      setTiers([]);
    }

    setLoadingRanks(false);
  }, [selectedClassId, supabase]);

  useEffect(() => {
    loadRanks();
  }, [loadRanks]);

  /*
   * ============================================================
   * LOAD TIERS
   * ============================================================
   */

  const loadTiers = useCallback(async () => {
    if (!selectedRankId) {
      setTiers([]);
      setSortOrder(1);
      return;
    }

    setLoadingTiers(true);

    const { data, error } = await supabase
      .from("sub_ranks")
      .select(`
        id,
        rank_id,
        name,
        sort_order
      `)
      .eq("rank_id", selectedRankId)
      .order("sort_order", {
        ascending: true,
      })
      .order("name", {
        ascending: true,
      });

    if (error) {
      setMessage(error.message);
      setMessageType("error");
      setLoadingTiers(false);
      return;
    }

    const loadedTiers = (data ?? []) as Tier[];

    setTiers(loadedTiers);

    if (loadedTiers.length === 0) {
      setSortOrder(1);
    } else {
      const highestSortOrder = Math.max(
        ...loadedTiers.map((tier) => tier.sort_order)
      );

      setSortOrder(highestSortOrder + 1);
    }

    setLoadingTiers(false);
  }, [selectedRankId, supabase]);

  useEffect(() => {
    loadTiers();
  }, [loadTiers]);

  /*
   * ============================================================
   * ADD TIER
   * ============================================================
   */

  async function addTier(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const cleanedName = tierName.trim();

    if (!selectedRankId) {
      setMessage("Select a rank first.");
      setMessageType("error");
      return;
    }

    if (!cleanedName) {
      setMessage("Enter a tier name.");
      setMessageType("error");
      return;
    }

    if (!Number.isFinite(sortOrder)) {
      setMessage("Enter a valid sort order.");
      setMessageType("error");
      return;
    }

    const duplicateName = tiers.some(
      (tier) =>
        tier.name.trim().toLowerCase() ===
        cleanedName.toLowerCase()
    );

    if (duplicateName) {
      setMessage(
        `"${cleanedName}" already exists under ${
          selectedRank?.name ?? "this rank"
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
        .from("sub_ranks")
        .insert({
          rank_id: selectedRankId,
          name: cleanedName,
          sort_order: sortOrder,
        })
        .select(`
          id,
          rank_id,
          name,
          sort_order
        `)
        .single();

      if (error) {
        throw error;
      }

      const newTier = data as Tier;

      const updatedTiers = [...tiers, newTier].sort(
        (a, b) =>
          a.sort_order - b.sort_order ||
          a.name.localeCompare(b.name)
      );

      setTiers(updatedTiers);

      setTierName("");

      const highestSortOrder = Math.max(
        ...updatedTiers.map((tier) => tier.sort_order)
      );

      setSortOrder(highestSortOrder + 1);

      setMessage(`${cleanedName} was added successfully.`);
      setMessageType("success");
    } catch (error: unknown) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Failed to create tier."
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

  function exportTiersExcel() {
    if (!selectedClass || !selectedRank) {
      setMessage("Select a class and rank first.");
      setMessageType("error");
      return;
    }

    if (tiers.length === 0) {
      setMessage("There are no tiers to export.");
      setMessageType("error");
      return;
    }

    exportToExcel({
      filename: `${selectedClass.name}-${selectedRank.name}-Tiers`,
      sheetName: "Tiers",
      title: `${selectedClass.name} - ${selectedRank.name} Tiers`,

      columns: [
        {
          header: "Class",
          key: "class_name",
          value: () => selectedClass.name,
        },
        {
          header: "Rank",
          key: "rank_name",
          value: () => selectedRank.name,
        },
        {
          header: "Tier",
          key: "name",
        },
        {
          header: "Sort Order",
          key: "sort_order",
        },
      ],

      data: tiers,
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
            Loading tier management...
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
              Tier Management
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-400">
              Configure the tiers beneath each rank for repository
              organisation and Member progression.
            </p>
          </div>

          <button
            type="button"
            disabled={
              !selectedClass ||
              !selectedRank ||
              tiers.length === 0
            }
            onClick={exportTiersExcel}
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

      {/* CLASS / RANK SELECTOR */}

      <section
        className="
          mt-8
          grid
          gap-5
          rounded-2xl
          border
          border-neutral-800
          bg-neutral-900
          p-6
          md:grid-cols-2
        "
      >
        <div>
          <label
            htmlFor="tier-class"
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
            id="tier-class"
            value={selectedClassId}
            onChange={(event) => {
              setSelectedClassId(event.target.value);
              setSelectedRankId("");
              setTiers([]);
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

        <div>
          <label
            htmlFor="tier-rank"
            className="
              block
              text-xs
              font-semibold
              uppercase
              tracking-[0.15em]
              text-neutral-500
            "
          >
            Rank
          </label>

          <select
            id="tier-rank"
            value={selectedRankId}
            disabled={loadingRanks || ranks.length === 0}
            onChange={(event) => {
              setSelectedRankId(event.target.value);
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
              disabled:cursor-not-allowed
              disabled:opacity-50
            "
          >
            {loadingRanks ? (
              <option value="">
                Loading ranks...
              </option>
            ) : ranks.length === 0 ? (
              <option value="">
                No ranks available
              </option>
            ) : (
              ranks.map((rank) => (
                <option
                  key={rank.id}
                  value={rank.id}
                >
                  {rank.name}
                </option>
              ))
            )}
          </select>
        </div>
      </section>

      {/* CURRENT PATH */}

      {selectedClass && selectedRank && (
        <section
          className="
            mt-6
            rounded-2xl
            border
            border-neutral-800
            bg-neutral-900/60
            px-5
            py-4
          "
        >
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-neutral-500">
            Current Structure
          </p>

          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
            <span className="font-semibold text-white">
              {selectedClass.name}
            </span>

            <span className="text-neutral-600">→</span>

            <span className="font-semibold text-sky-300">
              {selectedRank.name}
            </span>

            <span className="text-neutral-600">→</span>

            <span className="text-neutral-400">
              {tiers.length}{" "}
              {tiers.length === 1 ? "Tier" : "Tiers"}
            </span>
          </div>
        </section>
      )}

      {/* ADD TIER */}

      {selectedRank && (
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
            {selectedRank.name}
          </p>

          <h2 className="mt-1 text-2xl font-bold">
            Add Tier
          </h2>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-400">
            Add a tier beneath this rank. For Aikido Mudansha this
            can be used for Tier 1, Tier 2 and Tier 3 progression.
          </p>

          <form
            onSubmit={addTier}
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
                htmlFor="tier-name"
                className="
                  block
                  text-xs
                  font-semibold
                  uppercase
                  tracking-wider
                  text-neutral-500
                "
              >
                Tier Name
              </label>

              <input
                id="tier-name"
                type="text"
                value={tierName}
                onChange={(event) =>
                  setTierName(event.target.value)
                }
                placeholder="Example: Tier 1"
                maxLength={100}
                required
                disabled={!selectedRankId || processing}
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
                  disabled:cursor-not-allowed
                  disabled:opacity-50
                "
              />
            </div>

            <div>
              <label
                htmlFor="tier-sort-order"
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
                id="tier-sort-order"
                type="number"
                value={sortOrder}
                onChange={(event) =>
                  setSortOrder(Number(event.target.value))
                }
                disabled={!selectedRankId || processing}
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
                  disabled:cursor-not-allowed
                  disabled:opacity-50
                "
              />
            </div>

            <button
              type="submit"
              disabled={processing || !selectedRankId}
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
              {processing ? "Adding..." : "Add Tier"}
            </button>
          </form>
        </section>
      )}

      {/* EXISTING TIERS */}

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
              {selectedRank
                ? `${selectedRank.name} Tiers`
                : "Existing Tiers"}
            </h2>

            <p className="mt-2 text-sm text-neutral-500">
              Lower sort numbers appear first.
            </p>
          </div>

          {selectedRank && tiers.length > 0 && (
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
              {tiers.length}{" "}
              {tiers.length === 1 ? "Tier" : "Tiers"}
            </span>
          )}
        </div>

        {loadingTiers ? (
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
              Loading tiers...
            </p>
          </div>
        ) : !selectedRank ? (
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
              No rank selected
            </h3>

            <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-neutral-500">
              Add or select a rank before configuring its tiers.
            </p>
          </div>
        ) : tiers.length === 0 ? (
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
              No tiers configured
            </h3>

            <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-neutral-500">
              {selectedRank.name} does not have any tiers yet.
            </p>
          </div>
        ) : (
          <div
            className="
              mt-5
              overflow-hidden
              rounded-2xl
              border
              border-neutral-800
              bg-neutral-900
            "
          >
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
              <div>Tier</div>
              <div>Status</div>
            </div>

            {tiers.map((tier, index) => (
              <div
                key={tier.id}
                className={`
                  grid
                  gap-4
                  px-5
                  py-5
                  md:grid-cols-[90px_minmax(0,1fr)_160px]
                  md:items-center

                  ${
                    index !== tiers.length - 1
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
                    {tier.sort_order}
                  </span>
                </div>

                <div>
                  <p className="text-xs uppercase tracking-wider text-neutral-500 md:hidden">
                    Tier
                  </p>

                  <p className="mt-1 text-lg font-semibold text-white md:mt-0">
                    {tier.name}
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

      {/* RECORD PROTECTION */}

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
          Tier deletion is intentionally not exposed on this screen.
          Tiers may already be referenced by repository content,
          grading progression and historical Member records. If a
          tier needs to be retired later, we should deactivate or
          archive it rather than destroy its historical references.
        </p>
      </section>
    </main>
  );
}