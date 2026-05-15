import {
  AdminShell,
  type AdminNavigationItem,
  ListCard,
  NextStepBanner,
  WorkflowCard,
} from "@/components/admin/admin-shell";
import { OpenclawZeroTokenStatus } from "@/components/admin/openclaw-zero-token-status";
import type { AdminMessages } from "@/lib/admin/content";

type AdminPageViewProps = {
  navigation: AdminNavigationItem[];
  currentPath: string;
  shell: AdminMessages["shell"];
  content: AdminMessages[keyof Pick<
    AdminMessages,
    | "onboarding"
    | "inbox"
    | "customers"
    | "orders"
    | "payments"
    | "bookings"
    | "integrations"
    | "openclawZalouser"
    | "automation"
    | "settings"
    | "headHunter"
  >];
  workflowCtaHref?: string;
  nextStepHref?: string;
  showWorkflow?: boolean;
  showGatewayStatus?: boolean;
  headerCompact?: boolean;
  guideHref?: string;
  guideLabel?: string;
  /** Ẩn phần list minh họa từ i18n — dùng khi trang có live data component riêng */
  hideList?: boolean;
  /** Dữ liệu thực để ghi đè phần list mock từ i18n */
  liveItems?: Array<{ title: string; subtitle: string; badge?: string; href?: string }>;
  workspaceLabels?: { retail: string; headhunter: string };
  children?: React.ReactNode;
};

export function AdminPageView({
  navigation,
  currentPath,
  shell,
  content,
  workflowCtaHref,
  nextStepHref,
  showWorkflow = true,
  showGatewayStatus = false,
  headerCompact,
  guideHref,
  guideLabel,
  hideList = false,
  liveItems,
  workspaceLabels,
  children,
}: AdminPageViewProps) {
  return (
    <AdminShell
      navigation={navigation}
      currentPath={currentPath}
      title={content.title}
      description={content.description}
      badge={shell.badge}
      sidebarTitle={shell.sidebarTitle}
      sidebarDescription={shell.sidebarDescription}
      guideHref={guideHref}
      guideLabel={guideLabel}
      headerCompact={headerCompact}
      workspaceLabels={workspaceLabels}
    >
      {!hideList && (liveItems || content.list) ? (
        <ListCard
          title={content.list?.title || "Danh sách"}
          description={content.list?.description || ""}
          items={liveItems || content.list?.items || []}
        />
      ) : null}

      {showGatewayStatus ? <OpenclawZeroTokenStatus /> : null}

      {children}

      {showWorkflow ? (
        <WorkflowCard
          title={content.workflow.title}
          description={shell.workflowDescription}
          steps={content.workflow.steps}
          ctaHref={workflowCtaHref}
          ctaLabel={workflowCtaHref ? shell.openRelatedPage : undefined}
        />
      ) : null}

      {content.nextStep && nextStepHref ? (
        <NextStepBanner
          href={nextStepHref}
          label={content.nextStep.label}
          copy={content.nextStep.copy}
        />
      ) : null}
    </AdminShell>
  );
}
