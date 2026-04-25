import {
  AdminShell,
  type AdminNavigationItem,
  ListCard,
  NextStepBanner,
  WorkflowCard,
} from "@/components/admin/admin-shell";
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
  >];
  workflowCtaHref?: string;
  nextStepHref?: string;
  showWorkflow?: boolean;
  headerCompact?: boolean;
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
  headerCompact,
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
      headerCompact={headerCompact}
    >
      {content.list ? (
        <ListCard
          title={content.list.title}
          description={content.list.description}
          items={content.list.items}
        />
      ) : null}

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
