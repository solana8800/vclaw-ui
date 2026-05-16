import type { AdminNavigationItem } from "@/components/admin/admin-shell";
import type { StatusDistributionCopy } from "@/components/admin/status-distribution-chart";
import { getLocaleHref, type AppLocale } from "@/i18n/routing";
import type { ReportDataLabels } from "@/lib/commerce/report-stats";
import type { ZalouserPanelMessages } from "@/lib/zalouser/zalouser-openclaw-messages";

export type InboxTaskStateChangeMsg = {
  label: string;
  from?: string;
  to: string;
  toColor:
    | "emerald"
    | "sky"
    | "purple"
    | "amber"
    | "indigo"
    | "teal"
    | "red"
    | "muted"
    | "brand";
};

export type InboxTaskTypeMessages = {
  label: string;
  approveAction: string;
  approveWarning?: string;
  approveChanges: InboxTaskStateChangeMsg[];
  rejectChanges: InboxTaskStateChangeMsg[];
};

type AdminListItem = {
  title: string;
  subtitle: string;
  badge?: string;
};

type AdminListSection = {
  title: string;
  description: string;
  items: AdminListItem[];
};

type AdminWorkflowSection = {
  title: string;
  steps: string[];
};

type AdminNextStep = {
  label: string;
  copy: string;
};

type AdminOperatorStart = {
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

export type ProductManagerMessages = {
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
  productCode?: string;
  autoGenerate?: string;
  autoGenerateHint?: string;
  autoGenerateError?: string;
  productCodePlaceholder?: string;
  productCodeHint?: string;
  uploadSuccess?: string;
  uploadError?: string;
  imageExistsWarning?: string;
  extractSuccess?: string;
  extractError?: string;
  commercePolicyTitle?: string;
  commercePolicySubtitle?: string;
  productKind?: string;
  paymentMode?: string;
  fulfillmentMode?: string;
  summary?: string;
  isSelecting?: string;
  kinds?: Record<string, string>;
  payments?: Record<string, string>;
  fulfillments?: Record<string, string>;
  hints?: Record<string, string>;
  alerts?: Record<string, string>;
  categories?: Record<string, string>;
  emptyState?: {
    title: string;
    description: string;
  };
  productInfo?: string;
  productCodeLabel?: string;
  quickView?: string;
  emptyList?: string;
  exportTitle?: string;
  exportDescription?: string;
  exportButton?: string;
};

export type CustomerManagerMessages = {
  addCustomer: string;
  name: string;
  phone: string;
  channel: string;
  latestMessage: string;
  labels: string;
  save: string;
  cancel: string;
  edit: string;
  delete: string;
  empty: string;
  totalOrders: string;
  totalBookings: string;
  activity: string;
  quickChat: string;
  createOrder: string;
  createBooking: string;
  statsTitle: string;
  recentJoined: string;
  activeCustomers: string;
  commercialIdentity: string;
  address: string;
  noAddress: string;
  noConversation: string;
  noPhone: string;
  searchPlaceholder: string;
  all: string;
  syncRealtime: string;
  hasOrders: string;
  joinedRecent: string;
  noMatch: string;
  actions: string;
  form: {
    namePlaceholder: string;
    email: string;
    emailPlaceholder: string;
    shippingAddress: string;
    shippingAddressPlaceholder: string;
    gender: string;
    genderUnknown: string;
    genderMale: string;
    genderFemale: string;
    salutation: string;
    salutationPlaceholder: string;
    labelsHint: string;
    saving: string;
  };
  confirmDelete: string;
  deleteError: string;
  noConversationError: string;
  loadConversationError: string;
};

export type BankSettingsMessages = {
  title: string;
  description: string;
  brandSection: string;
  shopName: string;
  shopNamePlaceholder: string;
  shopLogoUrl: string;
  website: string;
  contactSection: string;
  hotline: string;
  email: string;
  address: string;
  addressPlaceholder: string;
  paymentSection: string;
  bank: string;
  bankPlaceholder: string;
  accountNumber: string;
  accountNumberPlaceholder: string;
  accountHolder: string;
  accountHolderPlaceholder: string;
  phonePlaceholder?: string;
  emailPlaceholder?: string;
  preferredChannel: string;
  save: string;
  saving: string;
  saveSuccess: string;
  saveError: string;
  loading: string;
};

export type WorkspaceSettingsMessages = {
  identityTitle: string;
  identityDescription: string;
  defaultLanguage: string;
  langVi: string;
  langEn: string;
  firecrawlToken: string;
  firecrawlTokenDesc: string;
  approvalTitle: string;
  approvalDescription: string;
  statusOn: string;
  statusOff: string;
  saved: string;
  statusSaved: string;
  statusMissing: string;
  updateCta: string;
  savingNotice: string;
  saveSuccess: string;
  saveError: string;
  applyingGate: string;
  gateApplied: string;
  gateApplyError: string;
  modal: {
    confirm: string;
    cancel: string;
    on: string;
    off: string;
  };
  gates: Record<
    string,
    {
      label: string;
      description: string;
      enableExplain: string;
      disableExplain: string;
    }
  >;
};

export type GatewayHealthMessages = {
  unauthorized: string;
  unreachable: string;
  missingToken: string;
  noWebModels: string;
  noWebAuth: string;
  incompatibleModel: string;
  connected: string;
  responding: string;
  unknownConfig: string;
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
    widget?: {
      empty: string;
      approve: string;
      approving: string;
    };
  };
  productManager?: ProductManagerMessages;
  customerManager?: CustomerManagerMessages;
  bank?: BankSettingsMessages;
  workspace?: WorkspaceSettingsMessages;
  gatewayHealth?: GatewayHealthMessages;
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
  charts?: {
    revenueTitle: string;
    revenueDescription: string;
    orderStatusTitle: string;
    orderStatusDescription: string;
    customerGrowthTitle: string;
    customerGrowthDescription: string;
    channelsTitle: string;
    channelsDescription: string;
    topProductsTitle: string;
    topProductsDescription: string;
    paymentMethodTitle: string;
    paymentMethodDescription: string;
  };
  performance?: {
    sectionTitle: string;
    efficiencyTitle: string;
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
    /** Placeholder {count} */
    taskCountBadge?: string;
    queueEmptyLabel?: string;
    readyBadge?: string;
    guideTitle?: string;
    guideBody?: string;
    rejectTaskTitle?: string;
    stateChangesHeading?: string;
    rejectInboxWarning?: string;
    cancel?: string;
    processing?: string;
    taskTypes?: {
      payment: InboxTaskTypeMessages;
      digital: InboxTaskTypeMessages;
      booking: InboxTaskTypeMessages;
      shipping: InboxTaskTypeMessages;
      channel: InboxTaskTypeMessages;
    };
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
    billVerification?: {
      listEmptyAllApproved: string;
      /** Placeholder {orderId} */
      toastPaymentNotFound: string;
      viewLargeImage: string;
      billPreviewAlt: string;
      /** Placeholder {orderNumber} */
      imageFoundCaption: string;
      billImageMissingTitle: string;
      detail: string;
      viewOriginal: string;
      aiAnalyzing: string;
      verifyWithAi: string;
      close: string;
      /** Placeholder {confidence} */
      aiResultTitle: string;
      detectedAmountLabel: string;
      detectedContentLabel: string;
      quickActionsTitle: string;
      /** Placeholder {orderRef} */
      matchApproveHint: string;
      approveAndNotify: string;
      selectRequestTitle: string;
      selectRequestSubtitle: string;
      confirmApproveTitle: string;
      confirmApproveSubtitle: string;
      stateChangesHeading: string;
      rowTask: string;
      rowPayment: string;
      rowNextStep: string;
      taskPendingReview: string;
      taskDone: string;
      paymentAwaitingConfirm: string;
      paymentConfirmed: string;
      botContinuesFulfillment: string;
      verifyBeforeApprove: string;
      /** Placeholder {confidence} appended in UI when AI ran */
      verifyBeforeApproveAiSuffix: string;
      cancel: string;
      processing: string;
      confirmApprove: string;
    };
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
    servicePlaceholder: string;
    processing: string;
    bookingsCount: string;
    statusPending: string;
    statusConfirmed: string;
    statusCancelled: string;
    statusCompleted: string;
    deleteConfirm: string;
    emptyDay: string;
    addBookingCta: string;
    pageLoading: string;
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
    unknownCustomer?: string;
    cancelled?: string;
    searchPlaceholder?: string;
    cancel?: string;
    toastStatusUpdated?: string;
    toastUpdateError?: string;
    createdPrefix?: string;
    previewOrderValue?: string;
    previewFulfillmentType?: string;
    previewLineItems?: string;
    previewCustomerSection?: string;
    previewName?: string;
    previewPhone?: string;
    previewEmail?: string;
    previewShippingAddress?: string;
    previewProductsTitle?: string;
    thProduct?: string;
    thQty?: string;
    thUnitPrice?: string;
    thLineTotal?: string;
    unnamedProduct?: string;
    previewNoLineItems?: string;
    previewGrandTotal?: string;
    previewShippingSection?: string;
    previewOrderAddress?: string;
    previewNoAddress?: string;
    previewTracking?: string;
    previewShippingNote?: string;
    previewPaymentsSection?: string;
    previewBillAlt?: string;
    previewNoPayments?: string;
    confirmMoveTitle?: string;
    confirmMoveBody?: string;
    confirmMoveAction?: string;
    colWaitPayDesc?: string;
    colPaidDesc?: string;
    colProcessingDesc?: string;
    colDoneDesc?: string;
    colFollowUpDesc?: string;
    colCancelledDesc?: string;
    emptyColumn?: string;
    updatedAtLabel?: string;
    closePreview?: string;
    confirmMoveIntro?: string;
    missingValue?: string;
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
    bill: string;
    dateCreated: string;
    statusPending: string;
    statusCompleted: string;
    statusFailed: string;
    statsPending: string;
    statsDone: string;
    statsFailed: string;
    statsCollected: string;
    modalChangeTitle: string;
    modalPaymentInfo: string;
    modalStatusChange: string;
    modalImpact: string;
    modalWarning: string;
    cancel: string;
    saving: string;
    confirmWithLabel: string;
    effect_PENDING_COMPLETED: string;
    effect_PENDING_FAILED: string;
    warning_PENDING_FAILED: string;
    effect_COMPLETED_PENDING: string;
    warning_COMPLETED_PENDING: string;
    effect_COMPLETED_FAILED: string;
    warning_COMPLETED_FAILED: string;
    effect_FAILED_PENDING: string;
    effect_FAILED_COMPLETED: string;
    warning_FAILED_COMPLETED: string;
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
    /** Thông báo sau redirect OAuth; key = query `channel`. */
    oauthFlash?: Record<string, string>;
    envHintTitle?: string;
    envHintBody?: string;
  };
  automationRules?: {
    title: string;
    description: string;
    rules: Record<string, {
      label: string;
      description: string;
      enableExplain: string;
      disableExplain: string;
      delayLabel: string;
      delayUnit: string;
    }>;
    toastSaved: string;
    pendingConfirm: string;
    statusOn: string;
    statusOff: string;
    saved: string;
    modalDelayDescription: string;
  };
  automationHistory?: {
    title: string;
    description: string;
    empty: string;
    successCount: string;
    failedCount: string;
    sentContent: string;
    statusDone: string;
    statusFailed: string;
    types: Record<string, string>;
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
    orderDone: string;
    pendingOrders: string;
    notes?: {
      orderDone: string;
      paymentsDone: string;
      revenue: string;
      customers: string;
    };
  };
  /** Locale-aware labels for DB-backed overview metrics */
  dataLabels?: Partial<ReportDataLabels>;
  chartCopy?: {
    statusDistribution: StatusDistributionCopy & {
      labels?: Record<string, string>;
    };
    customerGrowth: {
      /** Placeholder {count} */
      tooltip: string;
    };
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
    badgePriority: string;
    interval: string;
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
    badgeAuto: string;
    statsDrafts: string;
    statsCross: string;
    statsFriends: string;
    statsGroups: string;
  };
  jobStats?: {
    queued: string;
    pending_publish: string;
    done: string;
    loading: string;
  };
  recruitment: AdminHhContent;
};

export type AdminHhContent = {
  title: string;
  description: string;
  list?: AdminListSection;
  nextStep?: AdminNextStep;
  stats: {
    activeJobs: string;
    totalCandidates: string;
    newCandidates: string;
    contactedToday: string;
  };
  jobPositions: {
    title: string;
    manageTitle: string;
    manageDesc: string;
    add: string;
    empty: string;
    form: {
      title: string;
      description: string;
      requirements: string;
      placeholderTitle: string;
      placeholderDesc: string;
      placeholderReq: string;
      submit: string;
      cancel: string;
    };
    linkedin: {
      postTitle: string;
      postSubtitle: string;
      postCta: string;
      postSuccess: string;
      postError: string;
      postTarget: string;
      postTargetCompany: string;
      postTargetPersonal: string;
      posting: string;
      viewPost: string;
      companyPageUrl: string;
      companyPagePlaceholder: string;
      companyPageHint: string;
      companyUrlRequired: string;
      optionalImageLabel: string;
      optionalImageChoose: string;
      optionalImageHint: string;
      optionalImageUploading: string;
      optionalImageReady: string;
      optionalImageRemove: string;
      optionalImageUploadFailed: string;
      postHistory: string;
      postHistoryEmpty: string;
      postedNoLink: string;
      targetPersonal: string;
      targetCompany: string;
      aiEnriching: string;
      aiRegenerate: string;
      aiEnrichHint: string;
      aiSaveToJd: string;
      aiEnrichSaved: string;
      aiEnrichFailed: string;
      copyInvalid: string;
    };
    actions: {
      deleteConfirm: string;
      candidates: string;
      postLi: string;
      companyPage: string;
    };
    status: {
      open: string;
      active: string;
      closed: string;
      postedBadge: string;
    };
    stats: {
      total: string;
      posted: string;
      hiring: string;
      candidates: string;
    };
  };
  candidates: {
    title: string;
    searchPlaceholder: string;
    allCandidates: string;
    syncSuccess: string;
    syncError: string;
    aiSearchSuccess: string;
    aiSearchError: string;
    newCandidatesFound: string;
    refreshing: string;
    refreshList: string;
    table: {
      candidate: string;
      sentiment: string;
      status: string;
      updated: string;
      actions: string;
      noHeadline: string;
      noResult: string;
    };
    statusPotential: string;
    statusContacted: string;
    statusInterested: string;
    statusScreening: string;
    statusHired: string;
    statusRejected: string;
  };
  settings: {
    title: string;
    linkedinAccount: string;
    proxy: string;
    aiPersona: string;
    automation: string;
    saveCta: string;
    saveSuccess: string;
    saveError: string;
    statusConnected: string;
    statusDisconnected: string;
    statusReady: string;
    statusSaved: string;
    statusMissing: string;
    linkedinSource: string;
    linkedinCompanyUrl: string;
    linkedinCompanyUrlDesc: string;
    linkedinCompanyUrlPlaceholder: string;
    syncWeb: string;
    syncWebDesc: string;
    linxaToken: string;
    linxaTokenDesc: string;
    firecrawlToken: string;
    firecrawlTokenDesc: string;
    automationDesc: string;
    openBrowser: string;
    browserRunning: string;
    browserOpening: string;
    browserError: string;
    accountPrefix: string;
    accountLinked: string;
    accountNotLinked: string;
    linkedinConnectedAs: string;
    refreshProfile: string;
    recheckProfile: string;
    loadSessionFromFile: string;
    loadSessionSuccess: string;
    loadSessionError: string;
    waitingForLogin: string;
    loginSuccess: string;
    loginTimeout: string;
    cancelLoginWait: string;
    cdpNotReady: string;
    gatewayNotReady: string;
    cdpHintLauncher: string;
    cdpHintDev: string;
    sessionSaved: string;
    sessionFilePath: string;
    viewProfile: string;
    statusWaiting: string;
    profileRefreshDone: string;
    gatewayConnectError: string;
    sessionLoggedInGeneric: string;
    sessionUsername: string;
    gatewayOptionalHint: string;
    sessionFromFile: string;
    reloginCta: string;
    advancedSession: string;
    rules: {
      autoInvite: string;
      autoInviteDesc: string;
      autoIntro: string;
      autoIntroDesc: string;
      autoCollect: string;
      autoCollectDesc: string;
      autoRemind: string;
      autoRemindDesc: string;
    };
  };
  linkedin: {
    searchCta: string;
    syncCta: string;
    analyzeProfile: string;
  };
  smartInbox: {
    sentiment: string;
    labels: string;
    nextActions: string;
    sentimentPositive: string;
    sentimentNeutral: string;
    sentimentNegative: string;
    nextActionTitle: string;
    nextActionDesc: string;
    nextActionAlert: string;
    viewDetail: string;
    syncAuto: string;
    syncAutoDesc: string;
  };
  overview: {
    manageJobs: string;
    recentCandidates: string;
    noActivity: string;
    viewAllCandidates: string;
  };
  workflow: AdminWorkflowSection;
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
    group_head_hunter: string;
    group_system: string;
    /** Label tab bên trong trang gộp */
    tab_orders: string;
    tab_payments: string;
    tab_shipping: string;
    tab_bot: string;
    tab_automation: string;
    hh_overview: string;
    hh_candidates: string;
    hh_jobs: string;
    hh_settings: string;
    ws_retail: string;
    ws_headhunter: string;
  };
  common: {
    statuses: Record<string, string>;
    modal: {
      confirm: string;
      cancel: string;
      current: string;
      change: string;
      update: string;
    };
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
  recruitment: AdminHhContent;
  openclawZalouser: AdminPageContent & { zalouserPanel: ZalouserPanelMessages };
};

type AdminNavKey = keyof AdminMessages["navigation"];

const adminNavOrder: Array<{
  key?: AdminNavKey;
  path?: string;
  type?: "link" | "separator" | "label";
  icon?: string;
  industry?: "RETAIL" | "HEAD_HUNTER" | "COMMON";
}> = [
  { key: "overview", path: "/admin", icon: "LayoutDashboard", industry: "RETAIL" },
  { type: "separator", industry: "RETAIL" },

  { key: "group_operations", type: "label", industry: "RETAIL" },
  { key: "customers", path: "/admin/customers", icon: "Users", industry: "RETAIL" },
  { key: "orders", path: "/admin/orders", icon: "ShoppingBag", industry: "RETAIL" },

  { key: "hh_overview", path: "/admin/recruitment", icon: "Linkedin", industry: "HEAD_HUNTER" },
  { type: "separator", industry: "HEAD_HUNTER" },
  { key: "hh_candidates", path: "/admin/recruitment/candidates", icon: "Users", industry: "HEAD_HUNTER" },
  { key: "hh_jobs", path: "/admin/recruitment/jobs", icon: "Briefcase", industry: "HEAD_HUNTER" },
  { key: "hh_settings", path: "/admin/recruitment/settings", icon: "Settings", industry: "HEAD_HUNTER" },

  { type: "separator", industry: "COMMON" },

  { key: "group_management", type: "label", industry: "RETAIL" },
  { key: "products", path: "/admin/products", icon: "Package", industry: "RETAIL" },
  { key: "bookings", path: "/admin/bookings", icon: "Calendar", industry: "RETAIL" },

  { type: "separator", industry: "RETAIL" },

  { key: "group_system", type: "label", industry: "RETAIL" },
  { key: "openclawZalouser", path: "/admin/zalouser", icon: "MessageCircle", industry: "RETAIL" },
  { key: "settings", path: "/admin/settings", icon: "Settings", industry: "RETAIL" },
];

export function getAdminPath(locale: AppLocale, path: string) {
  return getLocaleHref(locale, path);
}

export function getAdminNavigation(
  locale: AppLocale,
  labels: AdminMessages["navigation"],
  industry?: "RETAIL" | "HEAD_HUNTER",
): AdminNavigationItem[] {
  return adminNavOrder
    .filter((item) => !industry || !item.industry || item.industry === "COMMON" || item.industry === industry)
    .map((item) => ({
      href: item.path ? getAdminPath(locale, item.path) : undefined,
      label: item.key ? labels[item.key] : "",
      icon: item.icon,
      type: item.type || "link",
      industry: item.industry,
    }));
}
