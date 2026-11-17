/*
 * DEVELOPMENT DATA. Banks and mobile money networks for the payout picker.
 *
 * In production the backend fetches the official, complete list per country
 * from the payment partner (Paystack: GET /bank?country=..., Flutterwave:
 * GET /v3/banks/{country}) and caches it, so new banks appear without a
 * release. This list only stands in for that call. Anything missing can be
 * entered by hand ("My bank is not listed"), which Meet then checks.
 */
export const BANKS: Record<string, string[]> = {
  NG: [
    "Access Bank", "Citibank Nigeria", "Ecobank Nigeria", "Fidelity Bank", "First Bank of Nigeria", "First City Monument Bank (FCMB)",
    "Globus Bank", "Guaranty Trust Bank (GTBank)", "Jaiz Bank", "Keystone Bank", "Lotus Bank", "Optimus Bank", "Parallex Bank",
    "Polaris Bank", "PremiumTrust Bank", "Providus Bank", "Signature Bank", "Stanbic IBTC Bank", "Standard Chartered Nigeria",
    "Sterling Bank", "SunTrust Bank", "TAJBank", "Titan Trust Bank", "Union Bank of Nigeria", "United Bank for Africa (UBA)",
    "Unity Bank", "Wema Bank (ALAT)", "Zenith Bank", "Kuda Microfinance Bank", "OPay", "Moniepoint Microfinance Bank", "PalmPay",
    "VFD Microfinance Bank", "Carbon", "FairMoney Microfinance Bank", "Rubies Microfinance Bank", "Sparkle Microfinance Bank",
    "Paga", "LAPO Microfinance Bank", "AB Microfinance Bank", "Accion Microfinance Bank",
  ],
  GH: [
    "Absa Bank Ghana", "Access Bank Ghana", "Agricultural Development Bank (ADB)", "Bank of Africa Ghana", "CalBank", "Consolidated Bank Ghana",
    "Ecobank Ghana", "FBNBank Ghana", "Fidelity Bank Ghana", "First Atlantic Bank", "First National Bank Ghana", "GCB Bank",
    "Guaranty Trust Bank Ghana", "National Investment Bank", "OmniBSIC Bank", "Prudential Bank", "Republic Bank Ghana",
    "Societe Generale Ghana", "Stanbic Bank Ghana", "Standard Chartered Ghana", "United Bank for Africa Ghana", "Universal Merchant Bank", "Zenith Bank Ghana",
  ],
  KE: [
    "Absa Bank Kenya", "Access Bank Kenya", "Bank of Africa Kenya", "Bank of Baroda Kenya", "Bank of India Kenya", "Citibank Kenya",
    "Consolidated Bank of Kenya", "Co-operative Bank of Kenya", "Credit Bank", "Development Bank of Kenya", "Diamond Trust Bank (DTB)",
    "Ecobank Kenya", "Equity Bank", "Family Bank", "First Community Bank", "Gulf African Bank", "HFC (HF Group)", "I&M Bank", "Kingdom Bank",
    "KCB Bank", "Middle East Bank", "National Bank of Kenya", "NCBA Bank", "Paramount Bank", "Prime Bank", "SBM Bank Kenya", "Sidian Bank",
    "Stanbic Bank Kenya", "Standard Chartered Kenya", "UBA Kenya", "Victoria Commercial Bank",
  ],
  ZA: [
    "Absa", "Access Bank South Africa", "African Bank", "Bank Zero", "Bidvest Bank", "Capitec Bank", "Discovery Bank", "First National Bank (FNB)",
    "Grindrod Bank", "Investec", "Nedbank", "Sasfin Bank", "Standard Bank", "TymeBank", "Ubank",
  ],
  UG: ["Absa Bank Uganda", "Bank of Africa Uganda", "Centenary Bank", "dfcu Bank", "Equity Bank Uganda", "Housing Finance Bank", "KCB Bank Uganda", "PostBank Uganda", "Stanbic Bank Uganda", "Standard Chartered Uganda"],
  TZ: ["Azania Bank", "CRDB Bank", "Diamond Trust Bank Tanzania", "Equity Bank Tanzania", "Exim Bank Tanzania", "KCB Bank Tanzania", "NBC Bank", "NMB Bank", "Stanbic Bank Tanzania", "Standard Chartered Tanzania"],
  RW: ["Access Bank Rwanda", "Bank of Kigali", "BPR Bank Rwanda", "Ecobank Rwanda", "Equity Bank Rwanda", "I&M Bank Rwanda", "NCBA Rwanda"],
  CI: ["Banque Atlantique Cote d'Ivoire", "Bank of Africa Cote d'Ivoire", "BICI", "Coris Bank International", "Ecobank Cote d'Ivoire", "NSIA Banque", "SIB", "Societe Generale Cote d'Ivoire"],
  SN: ["Banque Atlantique Senegal", "Bank of Africa Senegal", "CBAO", "Ecobank Senegal", "Societe Generale Senegal"],
  EG: ["Banque du Caire", "Banque Misr", "Commercial International Bank (CIB)", "National Bank of Egypt", "QNB Egypt"],
  MA: ["Attijariwafa Bank", "Bank of Africa (BMCE)", "Banque Populaire", "CIH Bank", "Societe Generale Maroc"],
  ZM: ["Absa Bank Zambia", "First National Bank Zambia", "Indo Zambia Bank", "Stanbic Bank Zambia", "Zanaco"],
  CM: ["Afriland First Bank", "BICEC", "Ecobank Cameroun", "Societe Generale Cameroun", "UBA Cameroun"],
  ET: ["Awash Bank", "Bank of Abyssinia", "Commercial Bank of Ethiopia", "Dashen Bank"],
};

/** Banks found across much of the continent, used where a country has no list here yet. */
export const PAN_AFRICAN = ["Absa", "Access Bank", "Bank of Africa", "Ecobank", "Societe Generale", "Stanbic Bank", "Standard Chartered", "United Bank for Africa (UBA)"];

export const NETWORKS: Record<string, string[]> = {
  GH: ["MTN Mobile Money", "Telecel Cash", "AT Money"],
  KE: ["M-Pesa", "Airtel Money", "T-Kash"],
  UG: ["MTN Mobile Money", "Airtel Money"],
  TZ: ["M-Pesa", "Tigo Pesa", "Airtel Money", "HaloPesa"],
  RW: ["MTN Mobile Money", "Airtel Money"],
  CI: ["Orange Money", "MTN Mobile Money", "Moov Money", "Wave"],
  SN: ["Orange Money", "Wave", "Free Money"],
  ZM: ["MTN Mobile Money", "Airtel Money", "Zamtel Kwacha"],
  CM: ["MTN Mobile Money", "Orange Money"],
  ET: ["telebirr"],
};
