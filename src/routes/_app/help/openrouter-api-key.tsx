import { createFileRoute } from "@tanstack/react-router";
import {
  helpLinkClassName,
  SecretHelpPage,
} from "@/client/features/help/SecretHelpPage";

const OPENROUTER_KEYS_URL = "https://platform.deepseek.com/api_keys";

export const Route = createFileRoute("/_app/help/openrouter-api-key")({
  component: OpenrouterApiKeyHelpPage,
});

function OpenrouterApiKeyHelpPage() {
  return (
    <SecretHelpPage
      title="Set up your DeepSeek API key"
      intro={
        <>
          OpenSEO needs the <code>OPENROUTER_API_KEY</code> secret before AI
          features like SAM, the in-app SEO agent, can run. It is optional —
          everything else in OpenSEO works without it.
        </>
      }
      secretName="OPENROUTER_API_KEY"
      steps={
        <>
          <li>
            Create an account at{" "}
            <a
              className={helpLinkClassName}
              href="https://platform.deepseek.com"
              target="_blank"
              rel="noreferrer"
            >
              platform.deepseek.com
            </a>{" "}
            and add credits (pay-as-you-go, like DataForSEO).
          </li>
          <li>
            Go to{" "}
            <a
              className={helpLinkClassName}
              href={OPENROUTER_KEYS_URL}
              target="_blank"
              rel="noreferrer"
            >
              DeepSeek API Keys
            </a>{" "}
            and click "Create API Key".
          </li>
          <li>
            Save the key as the <code>OPENROUTER_API_KEY</code> secret in your
            environment:
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>
                Docker self-hosting: <code>.env</code>
              </li>
              <li>Cloudflare: set it in the Workers UI (see below)</li>
              <li>
                Local development: <code>.env.local</code>
              </li>
            </ul>
          </li>
          <li>Restart OpenSEO.</li>
        </>
      }
      dashboardPasteStep="Paste your DeepSeek API key and save."
      terminalPromptHint="Paste your DeepSeek API key when prompted."
    />
  );
}
