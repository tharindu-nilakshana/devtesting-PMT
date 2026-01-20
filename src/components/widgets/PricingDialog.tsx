'use client';

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../ui/dialog";
import { Button } from "../ui/button";

interface PricingDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onUpgrade: (plan: string) => void;
}

const PLANS = [
  {
    name: "Pro",
    price: "$79",
    period: "per month",
    description: "Advanced tools for active traders who need real-time insights.",
    features: [
      "Full access to premium widgets",
      "Real-time market data feeds",
      "Advanced analytics & alerts",
      "Priority email support",
    ],
  },
  {
    name: "Enterprise",
    price: "Contact us",
    period: "",
    description: "Tailored solutions for desks and teams requiring custom workflows.",
    features: [
      "Everything in Pro",
      "Dedicated account manager",
      "Custom integrations",
      "White-glove onboarding",
    ],
  },
];

export function PricingDialog({ isOpen, onClose, onUpgrade }: PricingDialogProps) {
  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
    >
      <DialogContent className="max-w-3xl bg-background border-border text-foreground">
        <DialogHeader className="text-left">
          <DialogTitle className="text-2xl font-semibold">Upgrade Your Plan</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Unlock professional-grade analytics, live data, and collaboration features.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 md:grid-cols-2">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className="rounded-lg border border-border/60 bg-widget-body p-6 shadow-lg shadow-black/10"
            >
              <div className="mb-4">
                <h3 className="text-xl font-semibold text-foreground">{plan.name}</h3>
                <div className="mt-2 flex items-baseline gap-2 text-primary">
                  <span className="text-3xl font-bold">{plan.price}</span>
                  {plan.period && <span className="text-sm text-muted-foreground">{plan.period}</span>}
                </div>
                <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{plan.description}</p>
              </div>

              <ul className="mb-6 space-y-2 text-sm text-muted-foreground">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <Button
                type="button"
                className="w-full"
                onClick={() => onUpgrade(plan.name)}
              >
                Choose {plan.name}
              </Button>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}







