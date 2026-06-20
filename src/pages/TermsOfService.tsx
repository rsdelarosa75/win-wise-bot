import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const TermsOfService = () => {
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
          Terms of Service
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Bobby Vegas · Bobby Vegas AI Sports Advisor
        </p>

        <div className="mt-8 space-y-8 text-sm leading-relaxed text-foreground/90">
          <section className="space-y-3 rounded-lg border border-border bg-card/50 p-4">
            <h2 className="text-base font-bold text-primary">Nature of the service</h2>
            <p className="text-muted-foreground">
              <strong className="text-foreground">Bobby Vegas</strong> is provided for{" "}
              <strong className="text-foreground">entertainment and informational purposes only</strong>. It is not a gambling platform, sportsbook, or financial advisor.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-primary">No gambling liability</h2>
            <p className="text-muted-foreground">
              We are <strong className="text-foreground">not responsible for any gambling losses</strong> or other financial outcomes. Any wagering you choose to place is solely at your own risk and subject to the laws that apply to you.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-primary">Eligibility</h2>
            <p className="text-muted-foreground">
              You must be <strong className="text-foreground">18 years of age or older</strong> to use Bobby Vegas.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-primary">Accuracy</h2>
            <p className="text-muted-foreground">
              We make <strong className="text-foreground">no guarantee of accuracy</strong> for AI-generated picks, odds displayed in the app, or any other content. Lines and information can change without notice; always verify with official sources before making decisions.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-primary">AI-generated content</h2>
            <p className="text-muted-foreground">
              Bobby Vegas picks are <strong className="text-foreground">AI-generated</strong> and should{" "}
              <strong className="text-foreground">not be solely relied upon</strong> for betting or financial decisions. Use your own judgment and comply with applicable laws.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-primary">Prohibited use</h2>
            <p className="text-muted-foreground">
              You may not use Bobby Vegas in <strong className="text-foreground">jurisdictions where sports betting or related activities are illegal</strong>, or in any way that violates applicable law. You are responsible for knowing and following the rules where you live and where you use the app.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-primary">Contact</h2>
            <p className="text-muted-foreground">
              Questions about these terms:{" "}
              <a
                href="mailto:support@bobbyvegasai.com"
                className="font-semibold text-primary underline underline-offset-2"
              >
                support@bobbyvegasai.com
              </a>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default TermsOfService;
