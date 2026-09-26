export type AppRole =
  | "member"
  | "admin"
  | "super_admin";


export type NavigationItem = {
  label: string;
  href: string;

  roles: AppRole[];

  requiresRepositoryUpload?: boolean;

  section:
    | "main"
    | "management"
    | "content"
    | "system";
};


export const navigationItems:
  NavigationItem[] = [

  /*
   * =====================================================
   * COMMON
   * =====================================================
   */

  {
    label: "Dashboard",
    href: "/",

    roles: [
      "member",
      "admin",
      "super_admin",
    ],

    section: "main",
  },


  {
    label: "Repository",
    href: "/repository",

    roles: [
      "member",
      "admin",
      "super_admin",
    ],

    section: "main",
  },


  {
    label: "Calendar",
    href: "/calendar",

    roles: [
      "member",
      "admin",
      "super_admin",
    ],

    section: "main",
  },


  {
    label: "Schedules",
    href: "/schedules",

    roles: [
      "member",
      "admin",
      "super_admin",
    ],

    section: "main",
  },


  {
    label: "Directory",
    href: "/directory",

    roles: [
      "member",
      "admin",
      "super_admin",
    ],

    section: "main",
  },


  {
    label: "Notifications",
    href: "/notifications",

    roles: [
      "member",
      "admin",
      "super_admin",
    ],

    section: "main",
  },


  {
    label: "Profile",
    href: "/profile",

    roles: [
      "member",
      "admin",
      "super_admin",
    ],

    section: "main",
  },


  /*
   * =====================================================
   * MEMBER FINANCE
   * =====================================================
   */

  {
    label: "Subscription",
    href: "/subscription",

    roles: [
      "member",
      "admin",
      "super_admin",
    ],

    section: "main",
  },


  /*
   * =====================================================
   * ADMIN
   * =====================================================
   */

  {
    label: "Members",
    href: "/admin/members",

    roles: [
      "admin",
      "super_admin",
    ],

    section: "management",
  },


  /*
   * =====================================================
   * BREAK REQUESTS
   * =====================================================
   */

  {
    label: "Break Requests",
    href: "/admin/break-request",

    roles: [
      "admin",
      "super_admin",
    ],

    section: "management",
  },


  /*
   * =====================================================
   * ENROLLMENT REQUESTS
   * =====================================================
   */

  {
    label: "Enrollment Requests",
    href: "/admin/enrollment-requests",

    roles: [
      "admin",
      "super_admin",
    ],

    section: "management",
  },


  /*
   * =====================================================
   * CLASS MANAGEMENT
   * =====================================================
   */

  {
    label: "Classes",
    href: "/admin/classes",

    roles: [
      "super_admin",
    ],

    section: "management",
  },


  {
    label: "Dojos",
    href: "/admin/dojos",

    roles: [
      "admin",
      "super_admin",
    ],

    section: "management",
  },


  {
    label: "Ranks",
    href: "/admin/ranks",

    roles: [
      "admin",
      "super_admin",
    ],

    section: "management",
  },


  {
    label: "Tiers",
    href: "/admin/tiers",

    roles: [
      "admin",
      "super_admin",
    ],

    section: "management",
  },


  /*
   * =====================================================
   * FINANCE
   * =====================================================
   */

  {
    label: "Payments",
    href: "/admin/payments",

    roles: [
      "admin",
      "super_admin",
    ],

    section: "management",
  },


  {
    label: "Manage Schedules",
    href: "/admin/schedules",

    roles: [
      "admin",
      "super_admin",
    ],

    section: "management",
  },

  {
    label: "Assessments",
    href: "/admin/assessments",

    roles: [
      "super_admin",
    ],

    section: "management",
  },

  {
    label: "Subscriptions",
    href: "/admin/subscriptions",

    roles: [
      "admin",
      "super_admin",
    ],

    section: "management",
  },


  {
    label: "Settlements",
    href: "/admin/settlements",

    roles: [
      "admin",
      "super_admin",
    ],

    section: "management",
  },


  /*
   * =====================================================
   * RECORDS / DOCUMENTS
   * =====================================================
   */

  {
    label: "Archive",
    href: "/admin/archive",

    roles: [
      "admin",
      "super_admin",
    ],

    section: "management",
  },


  {
    label: "Certificates",
    href: "/admin/certificates",

    roles: [
      "admin",
      "super_admin",
    ],

    section: "management",
  },


  {
    label: "Reports",
    href: "/admin/reports",

    roles: [
      "admin",
      "super_admin",
    ],

    section: "management",
  },


  /*
   * =====================================================
   * MEMBERSHIP MOVEMENT
   * =====================================================
   */

  {
    label: "Transfers",
    href: "/admin/transfers",

    roles: [
      "admin",
      "super_admin",
    ],

    section: "management",
  },


  {
    label: "Dojo Migrations",
    href: "/admin/dojo-migrations",

    roles: [
      "admin",
      "super_admin",
    ],

    section: "management",
  },


  /*
   * =====================================================
   * CONTENT
   * =====================================================
   */

  {
    label: "Repository Upload",
    href: "/repository/upload",

    roles: [
      "member",
      "admin",
      "super_admin",
    ],

    requiresRepositoryUpload: true,

    section: "content",
  },


  {
    label: "Repository Uploaders",
    href: "/admin/repository-uploaders",

    roles: [
      "super_admin",
    ],

    section: "system",
  },


  {
    label: "Events",
    href: "/admin/events",

    roles: [
      "super_admin",
    ],

    section: "content",
  },


  {
    label: "Announcements",
    href: "/admin/announcements",

    roles: [
      "admin",
      "super_admin",
    ],

    section: "content",
  },


  /*
   * =====================================================
   * LEGACY / TEMPORARY
   * =====================================================
   */

  {
    label: "Applications",
    href: "/admin/applications",

    roles: [
      "super_admin",
    ],

    section: "system",
  },


  {
    label: "Member IDs",
    href: "/admin/member-ids",

    roles: [
      "super_admin",
    ],

    section: "system",
  },

];


/*
 * =====================================================
 * ROLE NAVIGATION
 * =====================================================
 */

export function getNavigationForRole(
  role: AppRole,
  capabilities?: {
    repositoryUpload?: boolean;
  },
) {
  return navigationItems.filter(
    (item) =>
      item.roles.includes(role) &&
      (!item.requiresRepositoryUpload || capabilities?.repositoryUpload === true)
  );
}
