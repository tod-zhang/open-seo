import { Link } from "@tanstack/react-router";
import { ShieldAlert, Wrench } from "lucide-react";
import { GateCard } from "@/client/components/GateCard";
import { Alert, AlertDescription } from "@/client/components/ui/alert";
import { Button } from "@/client/components/ui/button";
import { isByokClientMode } from "@/lib/byok";

export function SamSetupGate({
  errorMessage,
  isRefetching,
  onRetry,
}: {
  errorMessage: string | null;
  isRefetching: boolean;
  onRetry: () => void;
}) {
  return (
    <GateCard
      icon={Wrench}
      tone="warning"
      title="Enable AI Features"
      description={
        isByokClientMode() ? (
          <p>
            SAM, OpenSEO&apos;s in-app AI agent, runs on your own DeepSeek API
            key. Create a key on DeepSeek, add it in{" "}
            <Link
              className="underline underline-offset-2 hover:text-foreground"
              to="/settings"
            >
              Settings
            </Link>
            , then confirm here.
          </p>
        ) : (
          <>
            <p>
              SAM, OpenSEO&apos;s in-app AI agent, needs a DeepSeek API key.
              Create a key on DeepSeek, set it as the{" "}
              <code>OPENROUTER_API_KEY</code> environment variable, restart
              OpenSEO, then confirm here.
            </p>
            <p className="text-xs">
              Step-by-step instructions for every deployment are in the{" "}
              <Link
                className="underline underline-offset-2 hover:text-foreground"
                to="/help/openrouter-api-key"
              >
                DeepSeek API key setup guide
              </Link>
              .
            </p>
          </>
        )
      }
      actions={
        <>
          <Button size="lg" pending={isRefetching} onClick={onRetry}>
            Confirm API Key
          </Button>
          <Button
            size="lg"
            variant="outline"
            nativeButton={false}
            render={
              <a
                href="https://platform.deepseek.com/api_keys"
                target="_blank"
                rel="noreferrer"
              />
            }
          >
            Open DeepSeek Keys
          </Button>
        </>
      }
    >
      {errorMessage ? (
        <Alert variant="warning">
          <ShieldAlert />
          <AlertDescription className="text-foreground">
            {errorMessage}
          </AlertDescription>
        </Alert>
      ) : null}
    </GateCard>
  );
}
