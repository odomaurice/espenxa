/*
 * Africa-wide country reference data: the 55 African Union member states.
 *
 * This is static reference data only, used for pickers, flags and
 * formatting. Whether a country is open for registration, discovery,
 * booking, payments or payouts is market configuration served by the API
 * (`Market` in src/lib/api/types.ts), never decided here.
 *
 * Currencies are ISO 4217 codes; `minor` is the number of minor-unit digits,
 * so money can be stored as integers (never floats). Re-verify codes against
 * ISO 4217 when wiring payments: several currencies were redenominated
 * recently (for example SLE in 2022, ZWG in 2024).
 */
export type Region = "North" | "West" | "Central" | "East" | "Southern";

export type Country = {
  code: string; // ISO 3166-1 alpha-2
  name: string;
  dial: string;
  currency: string; // ISO 4217
  minor: number; // minor-unit digits
  languages: string[]; // ISO 639-1
  timezone: string; // IANA, capital city
  region: Region;
  cities: string[]; // suggested cities; free text is always allowed
  note?: string;
};

const c = (
  code: string,
  name: string,
  dial: string,
  currency: string,
  minor: number,
  languages: string[],
  timezone: string,
  region: Region,
  cities: string[] = [],
  note?: string,
): Country => ({ code, name, dial, currency, minor, languages, timezone, region, cities, note });

export const COUNTRIES: Country[] = [
  // North
  c("DZ", "Algeria", "+213", "DZD", 2, ["ar", "fr"], "Africa/Algiers", "North", ["Algiers", "Oran", "Constantine"]),
  c("EG", "Egypt", "+20", "EGP", 2, ["ar"], "Africa/Cairo", "North", ["Cairo", "Alexandria", "Giza", "Sharm El Sheikh"]),
  c("LY", "Libya", "+218", "LYD", 3, ["ar"], "Africa/Tripoli", "North", ["Tripoli", "Benghazi"]),
  c("MR", "Mauritania", "+222", "MRU", 2, ["ar", "fr"], "Africa/Nouakchott", "North", ["Nouakchott"]),
  c("MA", "Morocco", "+212", "MAD", 2, ["ar", "fr"], "Africa/Casablanca", "North", ["Casablanca", "Marrakech", "Rabat", "Tangier"]),
  c("EH", "Sahrawi Republic", "+212", "MAD", 2, ["ar", "es"], "Africa/El_Aaiun", "North", [], "AU member state. Telephone, currency and market treatment need legal and operational review."),
  c("TN", "Tunisia", "+216", "TND", 3, ["ar", "fr"], "Africa/Tunis", "North", ["Tunis", "Sfax", "Sousse"]),
  // West
  c("BJ", "Benin", "+229", "XOF", 0, ["fr"], "Africa/Porto-Novo", "West", ["Cotonou", "Porto-Novo"]),
  c("BF", "Burkina Faso", "+226", "XOF", 0, ["fr"], "Africa/Ouagadougou", "West", ["Ouagadougou", "Bobo-Dioulasso"]),
  c("CV", "Cabo Verde", "+238", "CVE", 2, ["pt"], "Atlantic/Cape_Verde", "West", ["Praia", "Mindelo"]),
  c("CI", "Côte d'Ivoire", "+225", "XOF", 0, ["fr"], "Africa/Abidjan", "West", ["Abidjan", "Yamoussoukro", "Bouaké"]),
  c("GM", "Gambia", "+220", "GMD", 2, ["en"], "Africa/Banjul", "West", ["Banjul", "Serekunda"]),
  c("GH", "Ghana", "+233", "GHS", 2, ["en"], "Africa/Accra", "West", ["Accra", "Kumasi", "Takoradi", "Tamale", "Cape Coast"]),
  c("GN", "Guinea", "+224", "GNF", 0, ["fr"], "Africa/Conakry", "West", ["Conakry"]),
  c("GW", "Guinea-Bissau", "+245", "XOF", 0, ["pt"], "Africa/Bissau", "West", ["Bissau"]),
  c("LR", "Liberia", "+231", "LRD", 2, ["en"], "Africa/Monrovia", "West", ["Monrovia"]),
  c("ML", "Mali", "+223", "XOF", 0, ["fr"], "Africa/Bamako", "West", ["Bamako"]),
  c("NE", "Niger", "+227", "XOF", 0, ["fr"], "Africa/Niamey", "West", ["Niamey"]),
  c("NG", "Nigeria", "+234", "NGN", 2, ["en"], "Africa/Lagos", "West", ["Lagos", "Abuja", "Port Harcourt", "Ibadan", "Benin City", "Enugu", "Kano", "Calabar"]),
  c("SN", "Senegal", "+221", "XOF", 0, ["fr"], "Africa/Dakar", "West", ["Dakar", "Saint-Louis", "Thiès"]),
  c("SL", "Sierra Leone", "+232", "SLE", 2, ["en"], "Africa/Freetown", "West", ["Freetown"]),
  c("TG", "Togo", "+228", "XOF", 0, ["fr"], "Africa/Lome", "West", ["Lomé"]),
  // Central
  c("BI", "Burundi", "+257", "BIF", 0, ["fr", "en"], "Africa/Bujumbura", "Central", ["Bujumbura", "Gitega"]),
  c("CM", "Cameroon", "+237", "XAF", 0, ["fr", "en"], "Africa/Douala", "Central", ["Douala", "Yaoundé", "Bamenda", "Buea"]),
  c("CF", "Central African Republic", "+236", "XAF", 0, ["fr"], "Africa/Bangui", "Central", ["Bangui"]),
  c("TD", "Chad", "+235", "XAF", 0, ["fr", "ar"], "Africa/Ndjamena", "Central", ["N'Djamena"]),
  c("CG", "Congo", "+242", "XAF", 0, ["fr"], "Africa/Brazzaville", "Central", ["Brazzaville", "Pointe-Noire"]),
  c("CD", "DR Congo", "+243", "CDF", 2, ["fr"], "Africa/Kinshasa", "Central", ["Kinshasa", "Lubumbashi", "Goma"]),
  c("GQ", "Equatorial Guinea", "+240", "XAF", 0, ["es", "fr", "pt"], "Africa/Malabo", "Central", ["Malabo", "Bata"]),
  c("GA", "Gabon", "+241", "XAF", 0, ["fr"], "Africa/Libreville", "Central", ["Libreville"]),
  c("ST", "São Tomé and Príncipe", "+239", "STN", 2, ["pt"], "Africa/Sao_Tome", "Central", ["São Tomé"]),
  // East
  c("KM", "Comoros", "+269", "KMF", 0, ["fr", "ar"], "Indian/Comoro", "East", ["Moroni"]),
  c("DJ", "Djibouti", "+253", "DJF", 0, ["fr", "ar"], "Africa/Djibouti", "East", ["Djibouti"]),
  c("ER", "Eritrea", "+291", "ERN", 2, ["ti", "ar", "en"], "Africa/Asmara", "East", ["Asmara"]),
  c("ET", "Ethiopia", "+251", "ETB", 2, ["am"], "Africa/Addis_Ababa", "East", ["Addis Ababa", "Hawassa", "Bahir Dar", "Dire Dawa"]),
  c("KE", "Kenya", "+254", "KES", 2, ["en", "sw"], "Africa/Nairobi", "East", ["Nairobi", "Mombasa", "Kisumu", "Nakuru", "Eldoret"]),
  c("MG", "Madagascar", "+261", "MGA", 2, ["mg", "fr"], "Indian/Antananarivo", "East", ["Antananarivo"]),
  c("MU", "Mauritius", "+230", "MUR", 2, ["en", "fr"], "Indian/Mauritius", "East", ["Port Louis", "Grand Baie"]),
  c("RW", "Rwanda", "+250", "RWF", 0, ["rw", "en", "fr", "sw"], "Africa/Kigali", "East", ["Kigali", "Musanze", "Huye"]),
  c("SC", "Seychelles", "+248", "SCR", 2, ["en", "fr"], "Indian/Mahe", "East", ["Victoria"]),
  c("SO", "Somalia", "+252", "SOS", 2, ["so", "ar"], "Africa/Mogadishu", "East", ["Mogadishu", "Hargeisa"]),
  c("SS", "South Sudan", "+211", "SSP", 2, ["en"], "Africa/Juba", "East", ["Juba"]),
  c("SD", "Sudan", "+249", "SDG", 2, ["ar", "en"], "Africa/Khartoum", "East", ["Khartoum"]),
  c("TZ", "Tanzania", "+255", "TZS", 2, ["sw", "en"], "Africa/Dar_es_Salaam", "East", ["Dar es Salaam", "Arusha", "Zanzibar City", "Dodoma", "Mwanza"]),
  c("UG", "Uganda", "+256", "UGX", 0, ["en", "sw"], "Africa/Kampala", "East", ["Kampala", "Entebbe", "Jinja", "Gulu"]),
  // Southern
  c("AO", "Angola", "+244", "AOA", 2, ["pt"], "Africa/Luanda", "Southern", ["Luanda"]),
  c("BW", "Botswana", "+267", "BWP", 2, ["en"], "Africa/Gaborone", "Southern", ["Gaborone", "Francistown", "Maun"]),
  c("SZ", "Eswatini", "+268", "SZL", 2, ["en"], "Africa/Mbabane", "Southern", ["Mbabane", "Manzini"]),
  c("LS", "Lesotho", "+266", "LSL", 2, ["en"], "Africa/Maseru", "Southern", ["Maseru"]),
  c("MW", "Malawi", "+265", "MWK", 2, ["en"], "Africa/Blantyre", "Southern", ["Lilongwe", "Blantyre"]),
  c("MZ", "Mozambique", "+258", "MZN", 2, ["pt"], "Africa/Maputo", "Southern", ["Maputo", "Beira"]),
  c("NA", "Namibia", "+264", "NAD", 2, ["en"], "Africa/Windhoek", "Southern", ["Windhoek", "Swakopmund"]),
  c("ZA", "South Africa", "+27", "ZAR", 2, ["en"], "Africa/Johannesburg", "Southern", ["Johannesburg", "Cape Town", "Durban", "Pretoria", "Gqeberha"]),
  c("ZM", "Zambia", "+260", "ZMW", 2, ["en"], "Africa/Lusaka", "Southern", ["Lusaka", "Ndola", "Livingstone"]),
  c("ZW", "Zimbabwe", "+263", "ZWG", 2, ["en"], "Africa/Harare", "Southern", ["Harare", "Bulawayo", "Victoria Falls"]),
];

export const REGIONS: Region[] = ["North", "West", "Central", "East", "Southern"];

export const countryByCode = (code?: string) => COUNTRIES.find((x) => x.code === code);

/** Countries sorted by name, for pickers. */
export const COUNTRIES_BY_NAME = [...COUNTRIES].sort((a, b) => a.name.localeCompare(b.name));
