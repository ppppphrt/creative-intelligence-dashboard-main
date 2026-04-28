import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Mail, Calendar, TrendingUp } from "lucide-react";
import { useState } from "react";

/**
 * Weekly Digests Page
 * Shows history of weekly email digests sent to the owner
 */
export default function Digests() {
  const [selectedDigest, setSelectedDigest] = useState<number | null>(null);

  // Mock digest history
  const digests = [
    {
      id: 1,
      weekStartDate: "April 21, 2026",
      topConcepts: [
        { concept: "Hormonal Acne", roas: 4.2, cpa: 85, spend: 2400 },
        { concept: "Before & After", roas: 3.8, cpa: 95, spend: 1600 },
        { concept: "Testimonial", roas: 3.5, cpa: 110, spend: 1800 },
      ],
      budgetAllocation: {
        topConceptsPercentage: 78.5,
        totalSpend: "฿8,400",
        recommendation: "✓ On track",
      },
      underperformers: [
        { concept: "Generic Demo", roas: 1.2, cpa: 280, recommendation: "PAUSE" },
        { concept: "Educational", roas: 1.5, cpa: 240, recommendation: "ITERATE" },
      ],
      sentAt: "April 28, 2026 at 9:00 AM",
      status: "sent",
    },
    {
      id: 2,
      weekStartDate: "April 14, 2026",
      topConcepts: [
        { concept: "Story Hook", roas: 3.9, cpa: 92, spend: 2200 },
        { concept: "UGC Content", roas: 3.6, cpa: 105, spend: 1800 },
      ],
      budgetAllocation: {
        topConceptsPercentage: 72.3,
        totalSpend: "฿5,600",
        recommendation: "✓ On track",
      },
      underperformers: [
        { concept: "Static Ads", roas: 1.8, cpa: 195, recommendation: "ITERATE" },
      ],
      sentAt: "April 21, 2026 at 9:00 AM",
      status: "sent",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Scheduled Digest Info */}
      <Card className="bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20 border-blue-200 dark:border-blue-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-blue-600" />
            Weekly Email Digest
          </CardTitle>
          <CardDescription>Automated weekly reports sent every Monday at 9:00 AM</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Next Digest</p>
              <p className="font-semibold">Monday, May 5, 2026</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Recipient</p>
              <p className="font-semibold">Marketing Lead</p>
            </div>
          </div>
          <p className="text-sm text-blue-700 dark:text-blue-300">
            ✓ Digests include: Top 5 concepts, budget allocation analysis, underperformers, and actionable recommendations
          </p>
        </CardContent>
      </Card>

      {/* Digest History */}
      <div>
        <h2 className="text-2xl font-bold mb-4">Digest History</h2>
        <div className="space-y-4">
          {digests.map((digest) => (
            <Card
              key={digest.id}
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => setSelectedDigest(selectedDigest === digest.id ? null : digest.id)}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <CardTitle className="text-lg">Week of {digest.weekStartDate}</CardTitle>
                      <CardDescription>Sent: {digest.sentAt}</CardDescription>
                    </div>
                  </div>
                  <Badge className="bg-green-600 text-white">Sent</Badge>
                </div>
              </CardHeader>

              {selectedDigest === digest.id && (
                <CardContent className="space-y-6 border-t pt-6">
                  {/* Top Concepts */}
                  <div>
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-green-600" />
                      Top Performing Concepts
                    </h3>
                    <div className="space-y-2">
                      {digest.topConcepts.map((concept, idx) => (
                        <div key={idx} className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                          <div className="flex items-center justify-between">
                            <p className="font-medium">{concept.concept}</p>
                            <Badge variant="outline">ROAS: {concept.roas}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            CPA: ฿{concept.cpa} | Spend: ฿{concept.spend.toLocaleString("th-TH")}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Budget Allocation */}
                  <div>
                    <h3 className="font-semibold mb-3">Budget Allocation</h3>
                    <div className="p-4 bg-accent/50 rounded-lg">
                      <p className="text-sm mb-2">
                        Top concepts receiving <strong>{digest.budgetAllocation.topConceptsPercentage}%</strong> of budget
                      </p>
                      <p className="text-sm mb-2">Total Spend: <strong>{digest.budgetAllocation.totalSpend}</strong></p>
                      <p className="text-sm font-medium text-green-600">{digest.budgetAllocation.recommendation}</p>
                    </div>
                  </div>

                  {/* Underperformers */}
                  <div>
                    <h3 className="font-semibold mb-3">Needs Review</h3>
                    <div className="space-y-2">
                      {digest.underperformers.map((concept, idx) => (
                        <div key={idx} className="p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg">
                          <div className="flex items-center justify-between">
                            <p className="font-medium">{concept.concept}</p>
                            <Badge
                              variant="outline"
                              className={
                                concept.recommendation === "PAUSE"
                                  ? "bg-red-100 text-red-900"
                                  : "bg-amber-100 text-amber-900"
                              }
                            >
                              {concept.recommendation}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            ROAS: {concept.roas} | CPA: ฿{concept.cpa}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Button variant="outline" className="w-full">
                    Resend Digest Email
                  </Button>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      </div>

      {/* Digest Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Digest Configuration</CardTitle>
          <CardDescription>Customize when and how you receive weekly digests</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">Send Day</label>
            <select className="w-full mt-2 px-3 py-2 border border-border rounded-lg bg-background">
              <option>Monday</option>
              <option>Tuesday</option>
              <option>Wednesday</option>
              <option>Thursday</option>
              <option>Friday</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-medium">Send Time</label>
            <select className="w-full mt-2 px-3 py-2 border border-border rounded-lg bg-background">
              <option>8:00 AM</option>
              <option>9:00 AM</option>
              <option>10:00 AM</option>
              <option>2:00 PM</option>
              <option>5:00 PM</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-medium">Recipient Email</label>
            <input
              type="email"
              placeholder="marketing@company.com"
              className="w-full mt-2 px-3 py-2 border border-border rounded-lg bg-background"
            />
          </div>

          <Button className="w-full">Save Configuration</Button>
        </CardContent>
      </Card>
    </div>
  );
}
