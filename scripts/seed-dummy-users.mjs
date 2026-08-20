/**
 * Jingwuguan Seibukan dummy-data seed
 *
 * Creates:
 *   0001       Test Super Admin
 *   0002-0006  Five Test Admins (one per class)
 *   0101-0110  10 Aikido Members
 *   0201-0210  10 Karate Members
 *   0301-0310  10 Kungfu Kids Members
 *   0401-0410  10 Taiji Members
 *   0501-0510  10 Xingyi Members
 *
 * Shared TEST password: 00000000
 *
 * Run from the project root:
 *   node scripts/seed-dummy-users.mjs
 *
 * Required .env.local:
 *   NEXT_PUBLIC_SUPABASE_URL=...
 *   SUPABASE_SERVICE_ROLE_KEY=...
 *
 * IMPORTANT:
 * - The service-role key must stay server-side and must never use NEXT_PUBLIC_.
 * - These are test accounts only. Delete them before production.
 */

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { createClient } from "@supabase/supabase-js";

function loadDotEnvLocal() {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return;

  const text = fs.readFileSync(envPath, "utf8");

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const eq = line.indexOf("=");
    if (eq < 1) continue;

    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

loadDotEnvLocal();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL) {
  throw new Error(
    "NEXT_PUBLIC_SUPABASE_URL is missing from .env.local"
  );
}

if (!SERVICE_ROLE_KEY) {
  throw new Error(
    "SUPABASE_SERVICE_ROLE_KEY is missing from .env.local"
  );
}

const supabase = createClient(
  SUPABASE_URL,
  SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

const TEST_PASSWORD = "00000000";
const TEST_EMAIL_DOMAIN = "dummy.jingwuguan.test";

const CLASS_NAMES = [
  "Aikido",
  "Karate",
  "Kungfu Kids",
  "Taiji",
  "Xingyi",
];

const ADMIN_IDS = {
  Aikido: "0002",
  Karate: "0003",
  "Kungfu Kids": "0004",
  Taiji: "0005",
  Xingyi: "0006",
};

const MEMBER_RANGES = {
  Aikido: ["0101", "0110"],
  Karate: ["0201", "0210"],
  "Kungfu Kids": ["0301", "0310"],
  Taiji: ["0401", "0410"],
  Xingyi: ["0501", "0510"],
};

function pad4(value) {
  return String(value).padStart(4, "0");
}

function range4(first, last) {
  const start = Number(first);
  const end = Number(last);
  const result = [];

  for (let n = start; n <= end; n += 1) {
    result.push(pad4(n));
  }

  return result;
}

function emailFor(memberId) {
  return `${memberId}@${TEST_EMAIL_DOMAIN}`;
}

function phoneFor(memberId) {
  // Deliberately fake Indonesia-style test number.
  return `620000${memberId}`;
}

function dateOfBirthFor(memberId, child = false) {
  const n = Number(memberId) || 1;
  const month = String((n % 12) + 1).padStart(2, "0");
  const day = String((n % 27) + 1).padStart(2, "0");
  const year = child ? 2014 + (n % 4) : 1990 + (n % 12);
  return `${year}-${month}-${day}`;
}

function safeSlug(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

async function must(queryPromise, label) {
  const { data, error } = await queryPromise;

  if (error) {
    throw new Error(`${label}: ${error.message}`);
  }

  return data;
}

async function getClasses() {
  const data = await must(
    supabase
      .from("classes")
      .select("id,name,is_active")
      .in("name", CLASS_NAMES),
    "Load classes"
  );

  const map = new Map(data.map((row) => [row.name, row]));

  for (const name of CLASS_NAMES) {
    if (!map.has(name)) {
      throw new Error(`Required class not found: ${name}`);
    }
  }

  return map;
}

async function getDojos(classMap) {
  const classIds = [...classMap.values()].map((item) => item.id);

  const data = await must(
    supabase
      .from("dojos")
      .select("id,class_id,name,active")
      .in("class_id", classIds)
      .eq("active", true)
      .order("name"),
    "Load active dojos"
  );

  const byClassId = new Map();

  for (const dojo of data) {
    if (!byClassId.has(dojo.class_id)) {
      byClassId.set(dojo.class_id, []);
    }
    byClassId.get(dojo.class_id).push(dojo);
  }

  return byClassId;
}

async function listAuthUsersByEmail() {
  const found = new Map();
  let page = 1;

  while (true) {
    const {
      data,
      error,
    } = await supabase.auth.admin.listUsers({
      page,
      perPage: 1000,
    });

    if (error) {
      throw new Error(`List Auth users: ${error.message}`);
    }

    for (const user of data.users) {
      if (user.email) {
        found.set(user.email.toLowerCase(), user);
      }
    }

    if (data.users.length < 1000) break;
    page += 1;
  }

  return found;
}

async function ensureAuthUser(memberId, fullName, authUserMap, child = false) {
  const email = emailFor(memberId);
  const existing = authUserMap.get(email.toLowerCase());

  if (existing) {
    const { data, error } =
      await supabase.auth.admin.updateUserById(existing.id, {
        password: TEST_PASSWORD,
        email_confirm: true,
        user_metadata: {
          ...(existing.user_metadata ?? {}),
          full_name: fullName,
          registration_number: memberId,
          phone: phoneFor(memberId),
          date_of_birth: dateOfBirthFor(memberId, child),
          username: memberId,
          dummy_account: true,
        },
      });

    if (error) {
      throw new Error(
        `Update Auth user ${memberId}: ${error.message}`
      );
    }

    return data.user;
  }

  const { data, error } =
    await supabase.auth.admin.createUser({
      email,
      password: TEST_PASSWORD,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        registration_number: memberId,
        phone: phoneFor(memberId),
        date_of_birth: dateOfBirthFor(memberId, child),
        username: memberId,
        dummy_account: true,
      },
    });

  if (error) {
    throw new Error(
      `Create Auth user ${memberId}: ${error.message}`
    );
  }

  authUserMap.set(email.toLowerCase(), data.user);
  return data.user;
}

async function upsertProfile({
  authUser,
  memberId,
  fullName,
  isSuperAdmin = false,
  child = false,
}) {
  const profile = {
    id: authUser.id,
    registration_number: memberId,
    username: memberId,
    full_name: fullName,
    email: emailFor(memberId),
    phone: phoneFor(memberId),
    whatsapp_number: phoneFor(memberId),
    date_of_birth: dateOfBirthFor(memberId, child),
    account_status: "active",
    email_verified: true,
    is_super_admin: isSuperAdmin,
    is_grading_assessor: false,
    aikikai_registration_number: null,
    must_change_password: false,
    activated_at: new Date().toISOString(),
  };

  await must(
    supabase
      .from("profiles")
      .upsert(profile, {
        onConflict: "id",
      }),
    `Upsert profile ${memberId}`
  );
}

async function ensureMembership({
  userId,
  classId,
  dojoId,
  role = "user",
}) {
  const existing = await must(
    supabase
      .from("class_memberships")
      .select("id")
      .eq("user_id", userId)
      .eq("class_id", classId)
      .maybeSingle(),
    "Check class membership"
  );

  const values = {
    user_id: userId,
    class_id: classId,
    dojo_id: dojoId ?? null,
    status: "active",
    break_count: 0,
    break_last_processed_month: null,
    level: "mudansha",
    role,
    joined_date: new Date().toISOString().slice(0, 10),
  };

  if (existing) {
    await must(
      supabase
        .from("class_memberships")
        .update(values)
        .eq("id", existing.id),
      `Update membership ${existing.id}`
    );

    return existing.id;
  }

  const created = await must(
    supabase
      .from("class_memberships")
      .insert(values)
      .select("id")
      .single(),
    "Create class membership"
  );

  return created.id;
}

async function ensureDojoAdminAssignment({
  userId,
  classId,
  dojoId,
  assignedBy,
}) {
  if (!dojoId) {
    return;
  }

  await must(
    supabase
      .from("dojo_admin_assignments")
      .upsert(
        {
          user_id: userId,
          class_id: classId,
          dojo_id: dojoId,
          active: true,
          assigned_by: assignedBy,
          assigned_at: new Date().toISOString(),
          revoked_by: null,
          revoked_at: null,
        },
        {
          onConflict: "user_id,dojo_id",
        }
      ),
    "Create/update dojo admin assignment"
  );
}

function chooseDojoForMember(dojos, index) {
  if (!dojos || dojos.length === 0) {
    return null;
  }

  return dojos[index % dojos.length].id;
}

async function main() {
  console.log("Loading classes and dojos...");

  const classMap = await getClasses();
  const dojoMap = await getDojos(classMap);
  const authUserMap = await listAuthUsersByEmail();

  const createdSummary = [];

  // ------------------------------------------------------------
  // 0001 SUPER ADMIN
  // ------------------------------------------------------------

  const superMemberId = "0001";
  const superName = "Test Super Admin";

  const superAuth = await ensureAuthUser(
    superMemberId,
    superName,
    authUserMap,
    false
  );

  await upsertProfile({
    authUser: superAuth,
    memberId: superMemberId,
    fullName: superName,
    isSuperAdmin: true,
  });

  // Give the Super Admin an Aikido membership too, so Member-facing
  // screens can be tested while logged into the Super Admin account.
  {
    const classRow = classMap.get("Aikido");
    const dojos = dojoMap.get(classRow.id) ?? [];
    const dojoId = chooseDojoForMember(dojos, 0);

    if (!dojoId) {
      throw new Error(
        "Aikido requires at least one active dojo for dummy data."
      );
    }

    await ensureMembership({
      userId: superAuth.id,
      classId: classRow.id,
      dojoId,
      role: "user",
    });
  }

  createdSummary.push({
    memberId: superMemberId,
    role: "Super Admin",
    className: "Aikido",
    email: emailFor(superMemberId),
  });

  // ------------------------------------------------------------
  // 5 ADMINS: 0002-0006
  // ------------------------------------------------------------

  const adminAuthByClass = new Map();

  for (const className of CLASS_NAMES) {
    const memberId = ADMIN_IDS[className];
    const fullName = `Test ${className} Admin`;
    const child = className === "Kungfu Kids";

    const authUser = await ensureAuthUser(
      memberId,
      fullName,
      authUserMap,
      child
    );

    await upsertProfile({
      authUser,
      memberId,
      fullName,
      child,
    });

    const classRow = classMap.get(className);
    const dojos = dojoMap.get(classRow.id) ?? [];
    const dojoId = chooseDojoForMember(dojos, 0);

    if (className === "Aikido" && !dojoId) {
      throw new Error(
        "Aikido requires at least one active dojo for its Admin."
      );
    }

    await ensureMembership({
      userId: authUser.id,
      classId: classRow.id,
      dojoId,
      role: "admin",
    });

    await ensureDojoAdminAssignment({
      userId: authUser.id,
      classId: classRow.id,
      dojoId,
      assignedBy: superAuth.id,
    });

    adminAuthByClass.set(className, authUser);

    createdSummary.push({
      memberId,
      role: "Admin",
      className,
      email: emailFor(memberId),
    });
  }

  // ------------------------------------------------------------
  // 10 MEMBERS PER CLASS
  // ------------------------------------------------------------

  for (const className of CLASS_NAMES) {
    const [first, last] = MEMBER_RANGES[className];
    const classRow = classMap.get(className);
    const dojos = dojoMap.get(classRow.id) ?? [];
    const ids = range4(first, last);

    if (className === "Aikido" && dojos.length === 0) {
      throw new Error(
        "Aikido requires at least one active dojo for its Members."
      );
    }

    for (let index = 0; index < ids.length; index += 1) {
      const memberId = ids[index];
      const fullName =
        `Test ${className} Member ${String(index + 1).padStart(2, "0")}`;

      const child = className === "Kungfu Kids";

      const authUser = await ensureAuthUser(
        memberId,
        fullName,
        authUserMap,
        child
      );

      await upsertProfile({
        authUser,
        memberId,
        fullName,
        child,
      });

      const dojoId = chooseDojoForMember(dojos, index);

      await ensureMembership({
        userId: authUser.id,
        classId: classRow.id,
        dojoId,
        role: "user",
      });

      createdSummary.push({
        memberId,
        role: "Member",
        className,
        email: emailFor(memberId),
      });
    }
  }

  // ------------------------------------------------------------
  // SUMMARY
  // ------------------------------------------------------------

  console.log("\nDummy-data seed complete.");
  console.log(`Accounts prepared: ${createdSummary.length}`);
  console.log(`Shared TEST password: ${TEST_PASSWORD}\n`);

  console.table(createdSummary);

  console.log(
    "\nIMPORTANT: Delete these accounts before production."
  );
}

main().catch((error) => {
  console.error("\nSeed failed:");
  console.error(error);
  process.exitCode = 1;
});
