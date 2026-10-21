import { useLayoutEffect } from "react";
import { SegmentedToggle } from "@/client/components/SegmentedToggle";
import { getLanguage, setLanguage, startTranslator } from "./translator";

// Labels are already in their own language, so the translator leaves them alone.
const LANGUAGE_OPTIONS = [
  { value: "zh" as const, label: "中文", icon: null },
  { value: "en" as const, label: "English", icon: null },
];

/** Starts the zh-CN UI translator once the client has rendered. */
export function UiTranslator() {
  // A layout effect runs before the first paint, so English never flashes.
  useLayoutEffect(() => startTranslator(), []);
  return null;
}

/** 中文 / English segmented radio for the account menu. */
export function LanguagePreferenceRadio() {
  return (
    <div data-no-translate>
      <SegmentedToggle
        items={LANGUAGE_OPTIONS}
        value={getLanguage()}
        onChange={setLanguage}
        showLabels
      />
    </div>
  );
}
