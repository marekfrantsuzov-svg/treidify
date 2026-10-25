export const instrumentChoices = [
  { id: "XAUUSD", label: "Gold", note: "XAUUSD" },
  { id: "DXY", label: "US Dollar Index", note: "DXY" },
  { id: "XAGUSD", label: "Silver", note: "XAGUSD" },
  { id: "EURUSD", label: "Euro / Dollar", note: "EURUSD" },
  { id: "GBPUSD", label: "Pound / Dollar", note: "GBPUSD" },
  { id: "USDJPY", label: "Dollar / Yen", note: "USDJPY" },
  { id: "US30", label: "Dow Jones", note: "US30" },
  { id: "NAS100", label: "Nasdaq 100", note: "NAS100" },
  { id: "SPX500", label: "S&P 500", note: "SPX500" },
  { id: "USOIL", label: "WTI Crude", note: "USOIL" },
  { id: "BTCUSD", label: "Bitcoin", note: "BTCUSD" },
] as const;

export const experienceChoices = [
  { id: "beginner", label: "New to trading", note: "Under a year, still building a routine." },
  { id: "intermediate", label: "Developing", note: "One to three years with a defined approach." },
  { id: "advanced", label: "Experienced", note: "Consistent process, reviewing to sharpen edge." },
  { id: "professional", label: "Professional", note: "Trading is the job, or managing capital." },
] as const;

export const onboardingSteps = ["Welcome", "Experience", "Instruments", "Time zone", "Dashboard", "Account", "Ready"] as const;
export const ONBOARDING_STEPS = onboardingSteps.length;
