import "server-only";

import {
  redirect,
} from "next/navigation";

import {
  createClient,
} from "@/lib/supabase/server";

import type {
  AppRole,
} from "@/lib/navigation";


export type CurrentAppUser = {
  id: string;

  fullName:
    | string
    | null;

  email:
    | string
    | null;

  memberId:
    | string
    | null;

  role: AppRole;

  isSuperAdmin:
    boolean;

  mustChangePassword:
    boolean;

  accountStatus:
    | string
    | null;

  hasApprovedMembership:
    boolean;
};


export async function getCurrentAppUser():
  Promise<CurrentAppUser> {

  const supabase =
    await createClient();


  /*
   * ============================================
   * AUTH USER
   * ============================================
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
    redirect(
      "/login"
    );
  }


  /*
   * ============================================
   * PROFILE
   * ============================================
   */

  const {
    data:
      profile,

    error:
      profileError,
  } =
    await supabase
      .from(
        "profiles"
      )
      .select(`
        id,
        full_name,
        email,
        registration_number,
        is_super_admin,
        must_change_password,
        account_status
      `)
      .eq(
        "id",
        user.id
      )
      .single();


  if (
    profileError ||
    !profile
  ) {
    /*
     * Auth account exists but the application
     * profile does not.
     *
     * For now send them back to login.
     */

    redirect(
      "/login?error=profile"
    );
  }


  /*
   * ============================================
   * DISABLED ACCOUNT
   * ============================================
   */

  if (
    profile.account_status ===
    "disabled"
  ) {
    redirect(
      "/login?error=disabled"
    );
  }


  /*
   * ============================================
   * ADMIN ASSIGNMENT
   * ============================================
   */

  const {
    data:
      adminAssignments,

    error:
      assignmentError,
  } =
    await supabase
      .from(
        "dojo_admin_assignments"
      )
      .select(
        "id"
      )
      .eq(
        "user_id",
        user.id
      )
      .eq(
        "active",
        true
      )
      .limit(
        1
      );


  if (
    assignmentError
  ) {
    console.error(
      "Unable to load Admin assignments:",
      assignmentError
    );
  }


  const isAdmin =
    (
      adminAssignments
        ?.length ??
      0
    ) > 0;


  /*
   * ============================================
   * APPROVED MEMBERSHIP
   * ============================================
   *
   * Registration creates a request before it
   * creates a class membership. A confirmed Auth
   * account must not enter the Member application
   * until an Admin has approved at least one class.
   */

  const {
    data:
      approvedMemberships,

    error:
      membershipError,
  } =
    await supabase
      .from(
        "class_memberships"
      )
      .select(
        "id"
      )
      .eq(
        "user_id",
        user.id
      )
      .limit(
        1
      );


  if (
    membershipError
  ) {
    console.error(
      "Unable to load approved memberships:",
      membershipError
    );
  }


  const hasApprovedMembership =
    (
      approvedMemberships
        ?.length ??
      0
    ) > 0;


  /*
   * ============================================
   * RESOLVE APPLICATION ROLE
   * ============================================
   */

  let role:
    AppRole =
      "member";


  if (
    profile.is_super_admin
  ) {
    role =
      "super_admin";
  }

  else if (
    isAdmin
  ) {
    role =
      "admin";
  }


  return {
    id:
      user.id,

    fullName:
      profile.full_name,

    email:
      profile.email ??
      user.email ??
      null,

    memberId:
      profile.registration_number,

    role,

    isSuperAdmin:
      profile.is_super_admin ===
      true,

    mustChangePassword:
      profile.must_change_password ===
      true,

    accountStatus:
      profile.account_status,

    hasApprovedMembership,
  };
}
