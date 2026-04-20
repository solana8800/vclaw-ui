import { 
  LayoutDashboard,
  Inbox,
  ShoppingBag,
  Calendar,
  CreditCard,
  Package,
  Users,
  Truck,
  BarChart3,
  Zap,
  Puzzle,
  Flag,
  Settings
} from "lucide-react";
import type { AdminNavigationItem } from "@/components/admin/admin-shell";
import { getLocaleHref, type AppLocale } from "@/i18n/routing";

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
    connect: string;
    disconnect: string;
    connected: string;
    notConnected: string;
  };
  automationQueue?: {
    title: string;
    placeholder: string;
    channelPlaceholder: string;
    enqueue: string;
    markDone: string;
    cancel: string;
    empty: string;
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
    group_operations: string;
    group_management: string;
    group_system: string;
  };
  overview: AdminPageContent;
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
  { key: "integrations", path: "/admin/integrations", icon: Puzzle },
  { key: "onboarding", path: "/admin/onboarding", icon: Flag },
  { key: "settings", path: "/admin/settings", icon: Settings },
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
