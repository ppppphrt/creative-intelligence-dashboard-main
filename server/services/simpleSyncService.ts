import { getDb } from "../db";
import { adsPerformance, creativeLibrary } from "../../drizzle/schema";

const META_AD_ACCOUNTS = [
  { id: "790515286671002", name: "idee 06" },
  { id: "1167175972155988", name: "idee 05" },
  { id: "664116972397842", name: "idee 03" },
  { id: "890040690415091", name: "idee 07" },
];

const SAMPLE_ADS = [
  { name: "Summer Sale - Limited Time", concept: "Urgency", persona: "Budget Conscious", hook: "Time Limit", format: "Video" },
  { name: "New Product Launch", concept: "Innovation", persona: "Early Adopter", hook: "Novelty", format: "Carousel" },
  { name: "Customer Testimonial", concept: "Social Proof", persona: "Decision Maker", hook: "Trust", format: "Image" },
  { name: "Flash Deal 50% Off", concept: "Discount", persona: "Deal Seeker", hook: "Price", format: "Video" },
  { name: "Free Shipping Offer", concept: "Value Add", persona: "Price Conscious", hook: "Benefit", format: "Image" },
  { name: "Brand Story Video", concept: "Storytelling", persona: "Values Aligned", hook: "Emotion", format: "Video" },
  { name: "Product Demo", concept: "Education", persona: "Researcher", hook: "How-to", format: "Video" },
  { name: "Limited Stock Alert", concept: "Scarcity", persona: "FOMO Driven", hook: "Availability", format: "Image" },
];

export async function syncSampleData() {
  try {
    const db = await getDb();
    if (!db) {
      console.error("[SimpleSyncService] Database not available");
      return { success: false, message: "Database not available" };
    }

    let totalAdsSynced = 0;
    const results = [];

    for (const account of META_AD_ACCOUNTS) {
      console.log(`[SimpleSyncService] Starting sync for account: ${account.name}`);
      let accountAdsSynced = 0;

      try {
        for (let i = 0; i < SAMPLE_ADS.length; i++) {
          const sampleAd = SAMPLE_ADS[i];
          const adId = `${account.id}_ad_${i}`;
          const creativeId = `creative_${account.id}_${i}`;

          // Generate realistic metrics
          const spend = Math.random() * 5000 + 100;
          const impressions = Math.floor(Math.random() * 100000 + 10000);
          const clicks = Math.floor(impressions * (Math.random() * 0.05 + 0.01));
          const reach = Math.floor(impressions * (Math.random() * 0.8 + 0.5));
          const roas = Math.random() * 4 + 0.5;
          const cpa = spend / Math.max(clicks, 1);
          const cpm = (spend / impressions) * 1000;

          try {
            // Insert or update ad performance
            await db.insert(adsPerformance).values({
              adId,
              accountId: `act_${account.id}`,
              adName: sampleAd.name,
              spend: spend.toFixed(2),
              roas: roas.toFixed(2),
              cpa: cpa.toFixed(2),
              impressions,
              reach,
              clicks,
              cpm: cpm.toFixed(2),
              metricDate: new Date(),
            });

            // Insert or update creative library
            await db.insert(creativeLibrary).values({
              creativeId,
              adId,
              caption: `${sampleAd.name} - ${sampleAd.concept}`,
              creativeUrl: null,
              concept: sampleAd.concept,
              persona: sampleAd.persona,
              hookType: sampleAd.hook,
              format: sampleAd.format,
              status: "READY",
            });

            accountAdsSynced++;
            totalAdsSynced++;
            console.log(`[SimpleSyncService] Synced ad: ${adId}`);
          } catch (adError) {
            console.error(`[SimpleSyncService] Error processing ad ${adId}:`, adError);
          }
        }

        results.push({
          account: account.name,
          status: "success",
          adsSynced: accountAdsSynced,
        });
        console.log(`[SimpleSyncService] Account ${account.name} synced ${accountAdsSynced} ads`);
      } catch (accountError) {
        console.error(`[SimpleSyncService] Error syncing account ${account.name}:`, accountError);
        results.push({
          account: account.name,
          status: "error",
          message: "Failed to sync",
        });
      }
    }

    console.log(`[SimpleSyncService] Total ads synced: ${totalAdsSynced}`);
    return {
      success: true,
      message: `Synced ${totalAdsSynced} sample ads from ${META_AD_ACCOUNTS.length} accounts`,
      totalAdsSynced,
      results,
    };
  } catch (error) {
    console.error("[SimpleSyncService] Error syncing all accounts:", error);
    return { success: false, message: "Sync failed", error: String(error) };
  }
}
