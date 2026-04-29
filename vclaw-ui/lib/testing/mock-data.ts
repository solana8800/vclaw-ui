
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


