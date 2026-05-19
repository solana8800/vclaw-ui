import { toast as sonnerToast } from "sonner";
import type { ExternalToast } from "sonner";

import { addNotification } from "@/lib/notifications/store";
import type { NotificationType } from "@/lib/notifications/store";

function extractText(message: unknown): string {
  if (typeof message === "string") return message;
  return "";
}

function persist(type: NotificationType, message: unknown, opts?: ExternalToast) {
  const msg = extractText(message);
  if (!msg) return;
  addNotification({
    type,
    message: msg,
    description: typeof opts?.description === "string" ? opts.description : undefined,
  });
}

const success = (message: unknown, options?: ExternalToast) => {
  persist("success", message, options);
  return sonnerToast.success(message as string, options);
};

const error = (message: unknown, options?: ExternalToast) => {
  persist("error", message, options);
  return sonnerToast.error(message as string, options);
};

const info = (message: unknown, options?: ExternalToast) => {
  persist("info", message, options);
  return sonnerToast.info(message as string, options);
};

const warning = (message: unknown, options?: ExternalToast) => {
  persist("warning", message, options);
  return sonnerToast.warning(message as string, options);
};

const message = (message: unknown, options?: ExternalToast) => {
  persist("default", message, options);
  return sonnerToast.message(message as string, options);
};

function toastFn(message: unknown, options?: ExternalToast) {
  persist("default", message, options);
  return sonnerToast(message as string, options);
}

export const toast = Object.assign(toastFn, {
  success,
  error,
  info,
  warning,
  message,
  loading: sonnerToast.loading,
  dismiss: sonnerToast.dismiss,
  promise: sonnerToast.promise,
  custom: sonnerToast.custom,
}) as typeof sonnerToast;
