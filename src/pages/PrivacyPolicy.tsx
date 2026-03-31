import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const PrivacyPolicy = () => {
  return (
    <div className="phone-shell min-h-svh overflow-x-hidden overflow-y-auto bg-background text-foreground">
      <header className="sticky top-0 z-10 flex items-center gap-2 border-b border-border bg-background/95 px-4 py-3 backdrop-blur-sm">
        <Button
          variant="ghost"
          size="sm"
          className="min-h-[44px] gap-2 text-primary hover:text-primary hover:bg-primary/10 -ml-2"
          asChild
        >
          <Link to="/">
            <ArrowLeft className="h-4 w-4 shrink-0" />
            Back
          </Link>
        </Button>
      </header>

      <div className="px-4 py-6 pb-16">
        <img
          src="/bobby-vegas-logo.png"
          alt="Bobby Vegas"
          className="mx-auto mb-6 w-[200px] max-w-full"
        />

        <h1 className="text-xl font-black tracking-tight text-primary">
          Privacy Policy
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Bobby Vegas · Bobby Vegas AI Sports Advisor
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Last updated: March 30, 2026
        </p>

        <div className="mt-8 space-y-8 text-sm leading-relaxed text-foreground/90">
          <section className="space-y-3">
            <h2 className="text-base font-bold text-primary">Overview</h2>
            <p>
              This Privacy Policy describes how <strong>Bobby Vegas</strong> (“we,” “us,” or “our”), operated by{" "}
              <strong>Bobby Vegas AI Sports Advisor</strong>, collects, uses, and protects your information when you use our app.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-primary">Data we collect</h2>
            <ul className="list-disc space-y-2 pl-5 text-muted-foreground">
              <li>Email address (for account creation and sign-in)</li>
              <li>Saved picks and related data you store in the app</li>
              <li>Usage data necessary to operate and improve the service</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-primary">How we use your data</h2>
            <p className="text-muted-foreground">
              We use this information for <strong className="text-foreground">account management</strong> and{" "}
              <strong className="text-foreground">app functionality</strong>, including authentication, saving your preferences and picks, and delivering features you request.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-primary">We do not sell your data</h2>
            <p className="text-muted-foreground">
              We do <strong className="text-foreground">not</strong> sell your personal information to third parties.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-primary">Third-party services</h2>
            <p className="text-muted-foreground">
              The app relies on trusted providers that may process data on our behalf:
            </p>
            <ul className="list-disc space-y-2 pl-5 text-muted-foreground">
              <li><strong className="text-foreground">Supabase</strong> — authentication and storage</li>
              <li><strong className="text-foreground">OpenAI</strong> — AI-generated analysis and picks</li>
              <li><strong className="text-foreground">The Odds API</strong> — sports odds data</li>
              <li><strong className="text-foreground">NewsAPI</strong> — news content</li>
            </ul>
            <p className="text-muted-foreground">
              Their use of data is governed by their respective privacy policies.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-primary">Your choices & deletion</h2>
            <p className="text-muted-foreground">
              You may request deletion of your account and associated data by contacting us at the email below. We will respond in line with applicable law.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-primary">Contact</h2>
            <p className="text-muted-foreground">
              Questions about this policy:{" "}
              <a
                href="mailto:support@bobbyvegasai.com"
                className="font-semibold text-primary underline underline-offset-2"
              >
                support@bobbyvegasai.com
              </a>
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-primary">Age requirement</h2>
            <p className="text-muted-foreground">
              Bobby Vegas is intended for users <strong className="text-foreground">18 years of age or older</strong> only. We do not knowingly collect personal information from anyone under 18.
            </p>
          </section>

          <section className="space-y-3 rounded-lg border border-border bg-card/50 p-4">
            <h2 className="text-base font-bold text-primary">Important disclaimer</h2>
            <p className="text-muted-foreground">
              Bobby Vegas is <strong className="text-foreground">not a gambling service</strong>. The app is provided for{" "}
              <strong className="text-foreground">entertainment and informational purposes only</strong>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
