export const overviewStats = [
  { label: "Open leads", value: "42", note: "Across Zalo, Messenger, Telegram" },
  { label: "Pending payments", value: "18", note: "Bills waiting operator review" },
  { label: "Bookings today", value: "9", note: "Appointments and service slots" },
  { label: "Follow-ups due", value: "13", note: "Need response or reminder" },
];

export const conversations = [
  {
    customer: "Linh Nguyen",
    channel: "Zalo",
    summary: "Asked for payment QR and wants same-day shipping.",
    status: "Awaiting payment",
  },
  {
    customer: "Anh Tran",
    channel: "Messenger",
    summary: "Sent transfer screenshot, bill verification needed.",
    status: "Review transfer",
  },
  {
    customer: "Mai Pham",
    channel: "Telegram",
    summary: "Requested slot for tomorrow afternoon.",
    status: "Booking follow-up",
  },
];

export const customers = [
  {
    name: "Linh Nguyen",
    segment: "Repeat buyer",
    source: "Zalo",
    tags: ["vip", "fast-response"],
  },
  {
    name: "Anh Tran",
    segment: "New lead",
    source: "Messenger",
    tags: ["payment-review"],
  },
  {
    name: "Mai Pham",
    segment: "Booking customer",
    source: "Telegram",
    tags: ["appointment"],
  },
];

export const orders = [
  { id: "ORD-201", customer: "Linh Nguyen", amount: "1,200,000 VND", status: "Awaiting payment" },
  { id: "ORD-198", customer: "Anh Tran", amount: "760,000 VND", status: "Reviewing bill" },
  { id: "ORD-192", customer: "Mai Pham", amount: "450,000 VND", status: "Scheduled" },
];

export const payments = [
  { ref: "PAY-301", type: "VietQR", state: "Generated", note: "Auto-filled from chat context" },
  { ref: "PAY-302", type: "Transfer screenshot", state: "Needs review", note: "Amount matches, content mismatch" },
  { ref: "PAY-303", type: "Reminder", state: "Queued", note: "Second follow-up after 24h" },
];

export const bookings = [
  { slot: "09:00 - 10:00", customer: "Mai Pham", service: "Consultation", status: "Confirmed" },
  { slot: "14:00 - 15:00", customer: "Truc Ho", service: "Pickup handoff", status: "Pending" },
  { slot: "17:30 - 18:00", customer: "Khanh Le", service: "After-sale support", status: "Reminder set" },
];

export const integrations = [
  { name: "Zalo channel", status: "Configured", detail: "Primary lead intake channel" },
  { name: "VietQR provider", status: "Configured", detail: "Ready to generate payment requests" },
  { name: "Delivery partner", status: "Draft", detail: "Shipping estimate adapter pending" },
];

export const automations = [
  { name: "Payment follow-up", trigger: "24h after QR sent", state: "Active" },
  { name: "Booking reminder", trigger: "2h before appointment", state: "Active" },
  { name: "Lead re-engagement", trigger: "No reply in 3 days", state: "Draft" },
];

export const onboardingSteps = [
  {
    title: "Choose the primary channel",
    description: "Pick the first customer channel to support in MVP.",
  },
  {
    title: "Set up payments",
    description: "Configure VietQR defaults and transfer review policy.",
  },
  {
    title: "Configure delivery or booking mode",
    description: "Choose between shipping-first or booking-first operations.",
  },
  {
    title: "Review automation defaults",
    description: "Turn on reminders, follow-up rules, and confirmation gates.",
  },
];
