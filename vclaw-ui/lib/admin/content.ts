import {
  LayoutDashboard,
  BookOpen,
  Inbox,
  ShoppingBag,
  Calendar,
  CreditCard,
  Package,
  Users,
  Truck,
  BarChart3,
  Zap,
  Settings,
  MessageCircle,
} from "lucide-react";
import type { AdminNavigationItem } from "@/components/admin/admin-shell";
import { getLocaleHref, type AppLocale } from "@/i18n/routing";
import type { ZalouserPanelMessages } from "@/lib/zalouser/zalouser-openclaw-messages";

export type AdminListItem = {
  title: string;
  subtitle: string;
  badge?: string;
};

export type AdminListSection = {
  title: string;
  description: string;
  items: AdminListItem[];
};

export type AdminWorkflowSection = {
  title: string;
  steps: string[];
};

export type AdminNextStep = {
  label: string;
  copy: string;
};

export type AdminOperatorStart = {
  title: string;
  subtitle: string;
  guideCta: string;
  stepWord: string;
  openWord: string;
  steps: Array<{ title: string; description: string; path: string }>;
};

export type AdminGuideContent = {
  title: string;
  description: string;
  intro: string;
  realtimeHeading: string;
  realtimeIntro: string;
  realtimeBullets: string[];
  firstSale: {
    title: string;
    colStep: string;
    colYou: string;
    colBot: string;
    colOpen: string;
    rows: Array<{
      step: string;
      you: string;
      bot: string;
      path: string;
      linkLabel: string;
    }>;
  };
  botHeading: string;
  botIntro: string;
  botExamples: Array<{ phrase: string; result: string }>;
  /** Nhóm menu Hệ thống & Cấu hình: thật vs pilot */
  systemConfig?: {
    title: string;
    intro: string;
    colArea: string;
    colLive: string;
    colPilot: string;
    colOpen: string;
    rows: Array<{
      name: string;
      live: string;
      pilot: string;
      path: string;
      linkLabel: string;
    }>;
  };
  /** Ý định tích hợp bot + webview (chưa triển khai đầy đủ) */
  botRoadmap?: {
    title: string;
    intro: string;
    bullets: string[];
  };
  laterHeading: string;
  laterBullets: Array<{ title: string; body: string }>;
  seedTitle: string;
  seedBody: string;
};

export type AdminPageContent = {
  title: string;
  description: string;
  list?: AdminListSection;
  workflow: AdminWorkflowSection;
  nextStep?: AdminNextStep;
  stats?: Array<{ label: string; value: string; note: string }>;
  extraLists?: AdminListSection[];
  taskInbox?: {
    title: string;
    tasks: Record<
      string,
      { title: string; subtitle: string; amount?: string; time: string }
    >;
  };
  liveChat?: {
    title: string;
    messages: Record<
      string,
      { name: string; text: string; time: string }
    >;
  };
  /** Nhãn cho StatsGrid số liệu thật trên tổng quan */
  dashboardStats?: {
    sectionTitle: string;
    items: {
      pendingPayments: { label: string; note: string };
      openOrders: { label: string; note: string };
      bookingsToday: { label: string; note: string };
      tasksOpen: { label: string; note: string };
    };
  };
  recentActivity?: {
    title: string;
    empty: string;
  };
  /** Tiêu đề / mô tả cho ListCard dữ liệu DB */
  dbLists?: {
    openOrdersTitle: string;
    openOrdersDescription: string;
    pendingPaymentsTitle: string;
    pendingPaymentsDescription: string;
  };
  operatorStart?: AdminOperatorStart;
  recentInvoices?: string;
  columns?: Record<string, string>;
  status?: Record<string, string>;
  reportSections?: Record<string, AdminListSection>;
  reportStats?: Record<string, Array<{ label: string; value: string; note: string }>>;
  manager?: {
    title?: string;
    description?: string;
    inputPlaceholder: string;
    actionButton: string;
    normalizing: string;
    estimating: string;
    resultTitle: string;
    estimatesTitle: string;
    emptyResult: string;
  };
  inboxManager?: {
    title: string;
    emptyInbox: string;
    approve: string;
    reject: string;
    edit: string;
  };
  /** Hội thoại webhook kênh (Zalo OA pilot) */
  channelThreads?: {
    title: string;
    description: string;
    empty: string;
    viewThread: string;
  };
  channelThreadView?: {
    back: string;
    threadTitle: string;
    openclawHint: string;
  };
  paymentManager?: {
    uploadLabel: string;
    orDragDrop: string;
    extracting: string;
    match: string;
    mismatch: string;
    needsVerification: string;
    requestApproval: string;
    expectedAmount: string;
    detectedAmount: string;
    listTitle?: string;
  };
  bookingManager?: {
    newBooking: string;
    date: string;
    time: string;
    customer: string;
    service: string;
    create: string;
    conflict: string;
    autoReminder: string;
    upcoming: string;
  };
  orderManager?: {
    waitPay: string;
    paid: string;
    processing: string;
    done: string;
    followUp: string;
    total: string;
    addOrder: string;
    createTitle?: string;
    customer?: string;
    amount?: string;
    status?: string;
    createSubmit?: string;
    moveStatus?: string;
  };
  productManager?: {
    addProduct: string;
    productName: string;
    price: string;
    description: string;
    uploadImage: string;
    imageUrl?: string;
    aiExtract: string;
    marketingAssist: string;
    extracting: string;
    generating: string;
    saveProduct: string;
    marketingPlaceholder: string;
    edit?: string;
    delete?: string;
    archive?: string;
    restore?: string;
    archived?: string;
    active?: string;
    cancelEdit?: string;
    total?: string;
    catalog?: string;
    all?: string;
    closeForm?: string;
    alerts?: Record<string, string>;
    categories?: Record<string, string>;
  };
  customerManager?: {
    addCustomer: string;
    name: string;
    phone: string;
    channel: string;
    labels: string;
    save: string;
    cancel: string;
    edit: string;
    delete: string;
    empty: string;
  };
  paymentList?: {
    listTitle: string;
    order: string;
    customer: string;
    amount: string;
    method: string;
    status: string;
    evidence: string;
    save: string;
    empty: string;
  };
  integrationPanel?: {
    title: string;
    hint: string;
    connectManual: string;
    disconnect: string;
    connectedOauth: string;
    connectedManual: string;
    notConnected: string;
    oauthZaloCta: string;
    oauthMetaCta: string;
    oauthShopeeCta: string;
    webhookHint?: string;
    oauthUnavailable?: string;
    oauthMetaUnavailable?: string;
    oauthShopeeUnavailable?: string;
    developerPortal: string;
    pilotNoOAuth: string;
    profileSavedTitle: string;
    metaProfileSavedTitle: string;
    shopeeProfileSavedTitle: string;
    oaIdLabel: string;
    metaUserLabel: string;
    metaPagesLabel: string;
    shopeeShopLabel: string;
    tokenExpiresLabel: string;
    zaloRefreshCta: string;
    shippingApisTitle: string;
    shippingApisBody: string;
    openGhnDocs: string;
    openGhtkDocs: string;
    ghtkSectionTitle: string;
    ghtkSectionBody: string;
    ghtkTokenLabel: string;
    ghtkPickProvince: string;
    ghtkPickDistrict: string;
    ghtkRecvProvince: string;
    ghtkRecvDistrict: string;
    ghtkRecvAddress: string;
    ghtkSave: string;
    ghtkSaveError: string;
    ghtkStoredHint: string;
    /** Thông báo sau redirect OAuth; key = query `channel`. */
    oauthFlash?: Record<string, string>;
    openGhtkSeller?: string;
    ghtkSellerHint?: string;
    envHintTitle?: string;
    envHintBody?: string;
  };
  automationQueue?: {
    title: string;
    placeholder: string;
    channelPlaceholder: string;
    draftLabel: string;
    draftPlaceholder: string;
    enqueue: string;
    markDone: string;
    cancel: string;
    empty: string;
    pilotNote: string;
    approvePublish: string;
    rejectDraft: string;
    approvalPending: string;
    approvalApproved: string;
    approvalRejected: string;
    approvalNone: string;
    needApproveBeforeDone: string;
  };
  shippingOrderNotes?: {
    title: string;
    order: string;
    note: string;
    estimate: string;
    save: string;
    empty: string;
  };
  liveStats?: {
    sectionTitle: string;
    orderCount: string;
    revenue: string;
    customers: string;
    products: string;
    paymentsDone: string;
  };
  shopeeExport?: {
    title: string;
    description: string;
    button: string;
  };
  reportBreakdown?: {
    ordersTitle: string;
    ordersDescription: string;
    paymentsTitle: string;
    paymentsDescription: string;
  };
  reportPrdNotice?: {
    disclaimer: string;
    performanceTitle: string;
    operationsSubtitle: string;
    growthTitle: string;
  };
  shopSummary?: {
    title: string;
    shopNameLabel: string;
    notSet: string;
    bankQrLabel: string;
    qrYes: string;
    qrNo: string;
    channelLabel: string;
    phoneLabel: string;
    emailLabel: string;
    addressLabel: string;
    editCta: string;
  };
  marketing?: {
    title: string;
    description: string;
    scanButton: string;
    reengageAllButton: string;
    statusStalled: string;
    hoursAgo: string;
    lastMessage: string;
    reengageSuccess: string;
    reengageError: string;
    candidateListTitle: string;
    emptyCandidates: string;
    reengageSingle: string;
    generating: string;
    sent: string;
  };
  heartbeat?: {
    title: string;
    description: string;
    triggerBtn: string;
    triggerSuccess: string;
    triggerError: string;
    running: string;
    empty: string;
    logTitle: string;
  };
};

export type AdminMessages = {
  shell: {
    badge: string;
    sidebarTitle: string;
    sidebarDescription: string;
    workflowDescription: string;
    openRelatedPage: string;
  };
  navigation: {
    overview: string;
    guide: string;
    onboarding: string;
    inbox: string;
    customers: string;
    orders: string;
    payments: string;
    bookings: string;
    integrations: string;
    automation: string;
    reports: string;
    shipping: string;
    products: string;
    settings: string;
    openclawZalouser: string;
    group_operations: string;
    group_management: string;
    group_system: string;
  };
  overview: AdminPageContent;
  guide: AdminGuideContent;
  onboarding: AdminPageContent;
  inbox: AdminPageContent;
  customers: AdminPageContent;
  orders: AdminPageContent;
  payments: AdminPageContent;
  bookings: AdminPageContent;
  integrations: AdminPageContent;
  automation: AdminPageContent;
  reports: AdminPageContent;
  shipping: AdminPageContent;
  products: AdminPageContent;
  settings: AdminPageContent;
  openclawZalouser: AdminPageContent & { zalouserPanel: ZalouserPanelMessages };
};

type AdminNavKey = keyof AdminMessages["navigation"];

const adminNavOrder: Array<{
  key?: AdminNavKey;
  path?: string;
  type?: "link" | "separator" | "label";
  icon?: any;
}> = [
  { key: "overview", path: "/admin", icon: LayoutDashboard },
  { type: "separator" },

  { key: "group_operations", type: "label" },
  { key: "inbox", path: "/admin/inbox", icon: Inbox },
  { key: "orders", path: "/admin/orders", icon: ShoppingBag },
  { key: "bookings", path: "/admin/bookings", icon: Calendar },
  { key: "payments", path: "/admin/payments", icon: CreditCard },

  { type: "separator" },

  { key: "group_management", type: "label" },
  { key: "products", path: "/admin/products", icon: Package },
  { key: "customers", path: "/admin/customers", icon: Users },
  { key: "shipping", path: "/admin/shipping", icon: Truck },
  { key: "reports", path: "/admin/reports", icon: BarChart3 },

  { type: "separator" },

  { key: "group_system", type: "label" },
  { key: "automation", path: "/admin/automation", icon: Zap },
  { key: "openclawZalouser", path: "/admin/zalouser", icon: MessageCircle },
  { key: "settings", path: "/admin/settings", icon: Settings },
  { key: "guide", path: "/admin/guide", icon: BookOpen },
];

export function getAdminPath(locale: AppLocale, path: string) {
  return getLocaleHref(locale, path);
}

export function getAdminNavigation(
  locale: AppLocale,
  labels: AdminMessages["navigation"],
): AdminNavigationItem[] {
  return adminNavOrder.map((item) => ({
    href: item.path ? getAdminPath(locale, item.path) : undefined,
    label: item.key ? labels[item.key] : "",
    icon: item.icon,
    type: item.type || "link",
  }));
}
