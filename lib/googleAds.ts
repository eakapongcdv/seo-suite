import { prisma } from "@/lib/db";
import { GoogleAdsApi, enums } from "google-ads-api";

/** Credentials structure expected in projectIntegration.config.secret (JSON) */
type GoogleAdsSecret = {
  developer_token: string;
  client_id: string;
  client_secret: string;
  refresh_token: string;
  login_customer_id?: string; // optional manager account id (no dashes)
  customer_id: string;        // target customer id (with or without dashes)
};

export async function getGoogleAdsClientForProject(projectId: string) {
  const integ = await prisma.projectIntegration.findFirst({
    where: { projectId, type: "RANK_API", status: "ACTIVE" },
    select: { config: true },
  });

  const cfg = (integ?.config ?? {}) as any;
  if (!cfg?.vendor || String(cfg.vendor).toLowerCase() !== "google") {
    throw new Error("Google Ads integration (vendor=google) is not configured for this project.");
  }

  let secret: GoogleAdsSecret | null = null;
  try {
    secret = typeof cfg.secret === "string" ? JSON.parse(cfg.secret) : cfg.secret;
  } catch {
    /* ignore; will fail on required fields */
  }

  if (
    !secret?.developer_token ||
    !secret.client_id ||
    !secret.client_secret ||
    !secret.refresh_token ||
    !secret.customer_id
  ) {
    throw new Error(
      "Google Ads credentials are incomplete. Please configure developer_token, client_id, client_secret, refresh_token, customer_id."
    );
  }

  const client = new GoogleAdsApi({
    developer_token: secret.developer_token,
    client_id: secret.client_id,
    client_secret: secret.client_secret,
  });

  // ✅ ใช้ customer_id (ตรงตาม type) — จะมีหรือไม่มีขีดก็ได้
  const normalizedCid = secret.customer_id.replace(/-/g, "");

  const customer = client.Customer({
    customer_id: normalizedCid,
    refresh_token: secret.refresh_token,
    login_customer_id: secret.login_customer_id, // optional MCC
  });

  return { customer, customerId: normalizedCid };
}

/**
 * Fetch avg_monthly_searches for given keywords with locale + geo using
 * Keyword Plan Idea Service via google-ads-api.
 */
export async function fetchAvgMonthlySearches(
  projectId: string,
  keywords: string[],
  opts?: {
    language_code?: "th" | "en" | "zh";
    geo_target_constants?: string[]; // e.g., ["geoTargetConstants/2392"] (Thailand)
  }
): Promise<Array<{ keyword: string; avgMonthlySearches: number }>> {
  const { customer, customerId } = await getGoogleAdsClientForProject(projectId);

  const language_code = opts?.language_code ?? "th";
  const geo_target_constants = opts?.geo_target_constants ?? ["geoTargetConstants/2392"]; // Thailand

  // language constants: EN=1000, TH=1014, ZH (Simplified)=1017
  const languageConstantMap: Record<string, string> = {
    en: "languageConstants/1000",
    th: "languageConstants/1014",
    zh: "languageConstants/1017",
  };
  const language = languageConstantMap[language_code] || languageConstantMap.th;

  const seedKeywords = Array.from(new Set(keywords.map((s) => s.trim()).filter(Boolean))).slice(0, 100);
  if (seedKeywords.length === 0) return [];

  // ✅ ใช้ wrapper ของแพ็กเกจ (ไม่มี getService)
  const resp = await customer.keywordPlanIdeas.generateKeywordIdeas({
    // บางเวอร์ชันของ wrapper ต้องการ customerId ใน payload; ใส่ไว้ให้ชัวร์
    // ถ้า type ขัด ให้ cast เป็น any
    customerId: customerId,
    language,
    geoTargetConstants: geo_target_constants,
    keywordPlanNetwork: enums.KeywordPlanNetwork.GOOGLE_SEARCH,
    keywordSeed: { keywords: seedKeywords },
  } as any);

  const ideas =
    resp?.results?.map((r: any) => ({
      keyword: String(r.text || ""),
      avgMonthlySearches: Number(r.keywordIdeaMetrics?.avgMonthlySearches ?? 0),
    })) ?? [];

  const wanted = new Set(seedKeywords.map((k) => k.toLowerCase()));
  return ideas
    .filter((r) => wanted.has(r.keyword.toLowerCase()))
    .sort((a, b) => b.avgMonthlySearches - a.avgMonthlySearches);
}
