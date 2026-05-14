export interface BankInfo {
  oaId: string;
  bin: string;
  shortName: string;
}

export const SUPPORTED_BANKS: Record<string, BankInfo> = {
  "Techcombank": {
    oaId: "7199462320524442313",
    bin: "970407",
    shortName: "TCB"
  },
  "Vietcombank": {
    oaId: "",
    bin: "970436",
    shortName: "VCB"
  },
  "VPBank": {
    oaId: "",
    bin: "970415",
    shortName: "VPB"
  }
};
