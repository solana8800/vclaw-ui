import {
  AdminShell,
  type AdminNavigationItem,
  ListCard,
  NextStepBanner,
  WorkflowCard,
} from "@/components/admin/admin-shell";
import type { AdminMessages } from "@/lib/admin-content";

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
    | "automation"
    | "settings"
  >];
  workflowCtaHref?: string;
  nextStepHref?: string;
};

export function AdminPageView({
  navigation,
  currentPath,
  shell,
  content,
  workflowCtaHref,
  nextStepHref,
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
    >
      {content.list ? (
        <ListCard
          title={content.list.title}
          description={content.list.description}
          items={content.list.items}
        />
      ) : null}

      <WorkflowCard
        title={content.workflow.title}
        description={shell.workflowDescription}
        steps={content.workflow.steps}
        ctaHref={workflowCtaHref}
        ctaLabel={workflowCtaHref ? shell.openRelatedPage : undefined}
      />

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
