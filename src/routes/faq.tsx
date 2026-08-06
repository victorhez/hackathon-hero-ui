import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, HelpCircle } from "lucide-react";
import { Logo } from "@/components/clearlend/logo";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export const Route = createFileRoute("/faq")({
  head: () => ({
    meta: [
      { title: "FAQ — How ClearLend lending works" },
      {
        name: "description",
        content:
          "Answers on A-Pass identity verification, reputation scoring, collateral tiers, verified-asset settlement and lender yield.",
      },
      { property: "og:title", content: "FAQ — How ClearLend lending works" },
      {
        property: "og:description",
        content: "Everything about identity-powered under-collateralised lending on ClearLend.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: FaqPage,
});

const GROUPS = [
  {
    title: "Identity & verification",
    items: [
      {
        q: "What is an A-Pass?",
        a: "An A-Pass is a verified identity credential issued after a bank-grade check binds a real person to a wallet address. ClearLend reads the credential's validity, level and freshness — never your underlying personal documents.",
      },
      {
        q: "Do you store my personal data?",
        a: "No. The app only ever sees a pass ID, verification level and expiry timestamp. Identity data stays with the issuer; lending decisions use a derived score.",
      },
      {
        q: "What happens when my pass expires?",
        a: "Borrowing is paused until you re-verify. Existing loans continue on their original terms, and your reputation score keeps its repayment history.",
      },
    ],
  },
  {
    title: "Reputation score",
    items: [
      {
        q: "How is my score calculated?",
        a: "Four weighted dimensions: verification level (30%), verified-asset transaction history (30%), loan repayment record (25%) and wallet age and activity (15%). The weighted result is a 0–100 score.",
      },
      {
        q: "How fast can I climb tiers?",
        a: "Each on-time repayment lifts your repayment sub-score, and consistent verified-asset activity compounds monthly. Most users move up one tier within a few complete loan cycles.",
      },
      {
        q: "What happens if I default?",
        a: "Collateral is claimed by the pool, the default is written to your audit trail, and your repayment sub-score drops sharply — which raises collateral requirements on future loans.",
      },
    ],
  },
  {
    title: "Borrowing & lending",
    items: [
      {
        q: "How can collateral be below 100%?",
        a: "Because identity plus reputation replaces part of the collateral. A Platinum borrower with a verified pass and a clean record is a far lower risk than an anonymous wallet, so the pool accepts thinner collateral.",
      },
      {
        q: "Why is settlement in verified assets only?",
        a: "Every transfer in and out of the pool is a verified-asset movement, so each loan event carries an auditable, compliance-ready proof.",
      },
      {
        q: "How do lenders earn yield?",
        a: "Deposits fund the pool and earn a share of borrower interest, accruing continuously. You can withdraw any unlocked portion of your position at any time.",
      },
      {
        q: "Which networks are supported?",
        a: "The interface supports Base, Monad, Ethereum, Arbitrum and BNB Chain, switchable from the header at any time.",
      },
    ],
  },
];

function FaqPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
          <Link to="/">
            <Logo />
          </Link>
          <Button asChild variant="hero">
            <Link to="/connect">
              Launch app <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-14">
        <span className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">
          <HelpCircle className="size-3.5 text-primary" /> Help centre
        </span>
        <h1 className="font-display mt-5 text-3xl font-semibold lg:text-4xl">
          Frequently asked <span className="text-gradient">questions</span>
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          How identity-powered lending works, what we can see, and how your terms improve over time.
        </p>

        {GROUPS.map((g) => (
          <section key={g.title} className="mt-10">
            <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
              {g.title}
            </h2>
            <Accordion type="single" collapsible className="mt-3">
              {g.items.map((item) => (
                <AccordionItem key={item.q} value={item.q}>
                  <AccordionTrigger className="text-left text-sm">{item.q}</AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground">
                    {item.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </section>
        ))}

        <div className="surface-card mt-12 rounded-2xl p-6 text-center">
          <h2 className="font-display text-lg font-semibold">Still have questions?</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Connect a wallet and explore the pool — no commitment until you confirm a loan.
          </p>
          <Button asChild variant="hero" size="lg" className="mt-5">
            <Link to="/connect">
              Get started <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
