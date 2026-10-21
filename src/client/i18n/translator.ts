import { messages, patterns } from "./zh-CN";

// Runtime UI translation. Instead of rewriting copy inside upstream components
// (which would conflict with every upstream merge), this swaps rendered
// English text for the zh-CN dictionary after React commits. It only changes
// the value of existing text nodes and attributes, never the DOM structure,
// so React keeps owning every node it created.

type Language = "zh" | "en";

const LANGUAGE_KEY = "openseo-language";
const ATTRIBUTES = ["placeholder", "title", "aria-label", "alt"];
const SKIP_TAGS = new Set([
  "SCRIPT",
  "STYLE",
  "TEXTAREA",
  "CODE",
  "PRE",
  "KBD",
]);
const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
const MONTH_NUMBER = new Map(MONTHS.map((month, index) => [month, index + 1]));

export function getLanguage(): Language {
  try {
    return window.localStorage.getItem(LANGUAGE_KEY) === "en" ? "en" : "zh";
  } catch {
    return "zh";
  }
}

export function setLanguage(language: Language) {
  try {
    window.localStorage.setItem(LANGUAGE_KEY, language);
  } catch {
    // Storage blocked: the choice lasts for this page only.
  }
  // A reload is the simplest way to put every original string back.
  window.location.reload();
}

const compiledPatterns = Object.entries(patterns).map(([source, target]) => ({
  regex: new RegExp(
    "^" +
      source
        .split(/\{\d\}/)
        .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
        .join("(.*?)") +
      "$",
  ),
  order: [...source.matchAll(/\{(\d)\}/g)].map((match) => Number(match[1])),
  target,
  // Prefer the most specific pattern: the one with the most literal text.
  weight: source.replace(/\{\d\}/g, "").length,
}));
compiledPatterns.sort((a, b) => b.weight - a.weight);

function translateDate(text: string): string | undefined {
  const match =
    /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\.? (\d{1,2})(?:, (\d{4}))?(.*)$/.exec(
      text,
    );
  if (match) {
    const [, month, day, year, rest] = match;
    const date = `${year ? `${year}年` : ""}${MONTH_NUMBER.get(month)}月${day}日`;
    if (!rest) return date;
    const time = /^,? (\d{1,2}:\d{2}) ?(AM|PM)$/.exec(rest);
    if (time) return `${date} ${time[2] === "AM" ? "上午" : "下午"} ${time[1]}`;
    return undefined;
  }
  const monthYear =
    /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) (\d{4})$/.exec(text);
  if (monthYear) return `${monthYear[2]}年${MONTH_NUMBER.get(monthYear[1])}月`;
  return undefined;
}

/** zh-CN for one piece of English copy, or undefined when there is none. */
function translateText(text: string): string | undefined {
  const key = text.replace(/\s+/g, " ").trim();
  if (!/[A-Za-z]/.test(key)) return undefined;
  const direct = messages[key];
  if (direct !== undefined) return direct;
  for (const { regex, order, target } of compiledPatterns) {
    const match = regex.exec(key);
    if (!match) continue;
    return order.reduce((result, slot, index) => {
      const value = match[index + 1];
      return result.replace(
        `{${slot}}`,
        messages[value] ?? translateDate(value) ?? value,
      );
    }, target);
  }
  return translateDate(key);
}

function withSpacing(original: string, translated: string) {
  const leading = /^\s*/.exec(original)?.[0] ?? "";
  const trailing = /\s*$/.exec(original)?.[0] ?? "";
  return leading + translated + trailing;
}

// What we last wrote to each node, and the English it replaced. When a node's
// value no longer equals what we wrote, React has rendered new English into it.
const textState = new WeakMap<Text, { original: string; written: string }>();
const attributeState = new WeakMap<
  Element,
  Map<string, { original: string; written: string }>
>();

function originalText(node: Text): string {
  const value = node.nodeValue ?? "";
  const state = textState.get(node);
  return state && state.written === value ? state.original : value;
}

function writeText(node: Text, original: string, value: string) {
  textState.set(node, { original, written: value });
  if (node.nodeValue !== value) node.nodeValue = value;
}

// Code, user input, and anything marked data-no-translate keeps its text.
function isOptedOut(element: Element): boolean {
  return (
    SKIP_TAGS.has(element.tagName) ||
    element.hasAttribute("data-no-translate") ||
    (element instanceof HTMLElement && element.isContentEditable)
  );
}

function isSkipped(element: Element): boolean {
  for (
    let current: Element | null = element;
    current;
    current = current.parentElement
  ) {
    if (isOptedOut(current)) return true;
  }
  return false;
}

// JSX like `Showing {count} keywords` renders several sibling text nodes.
// Translate them as one sentence: the first node gets the whole translation.
function translateTextGroup(element: Element): boolean {
  const children = element.childNodes;
  if (children.length < 2) return false;
  const nodes: Text[] = [];
  for (const child of children) {
    if (!(child instanceof Text)) return false;
    nodes.push(child);
  }
  const originals = nodes.map(originalText);
  const translated = translateText(originals.join(""));
  if (translated === undefined) return false;
  nodes.forEach((node, index) =>
    writeText(
      node,
      originals[index],
      index === 0 ? withSpacing(originals.join(""), translated) : "",
    ),
  );
  return true;
}

function translateTextNode(node: Text) {
  const original = originalText(node);
  const translated = translateText(original);
  writeText(
    node,
    original,
    translated === undefined ? original : withSpacing(original, translated),
  );
}

function translateAttributes(element: Element) {
  for (const name of ATTRIBUTES) {
    const value = element.getAttribute(name);
    if (value === null) continue;
    const states =
      attributeState.get(element) ??
      new Map<string, { original: string; written: string }>();
    attributeState.set(element, states);
    const state = states.get(name);
    const original = state && state.written === value ? state.original : value;
    const translated = translateText(original) ?? original;
    states.set(name, { original, written: translated });
    if (value !== translated) element.setAttribute(name, translated);
  }
}

// Translates the element's own attributes and direct text children.
function translateShallow(element: Element) {
  translateAttributes(element);
  if (translateTextGroup(element)) return;
  for (const child of element.childNodes) {
    if (child instanceof Text) translateTextNode(child);
  }
}

function translateSubtree(element: Element) {
  if (isOptedOut(element)) {
    // A textarea's text is user input, but its placeholder is copy.
    if (element.tagName === "TEXTAREA") translateAttributes(element);
    return;
  }
  translateShallow(element);
  for (const child of element.children) translateSubtree(child);
}

function translateTree(root: Element) {
  if (root.parentElement && isSkipped(root.parentElement)) return;
  translateSubtree(root);
}

function translateTitle() {
  const title = document.title;
  const translated = title
    .split(/( [|·—-] )/)
    .map((part, index) => (index % 2 ? part : (translateText(part) ?? part)))
    .join("");
  if (translated !== title) document.title = translated;
}

let started = false;

/** Translates the page now and keeps translating whatever React renders next. */
export function startTranslator() {
  if (started || getLanguage() !== "zh") return;
  started = true;
  document.documentElement.lang = "zh-CN";
  translateTree(document.body);
  translateTitle();

  const observer = new MutationObserver((records) => {
    const shallow = new Set<Element>();
    const deep = new Set<Element>();
    for (const record of records) {
      const target = record.target;
      if (!(target instanceof Element)) {
        // Text changed: re-read the sentence it belongs to.
        if (target.parentElement) shallow.add(target.parentElement);
        continue;
      }
      // An added text node may complete a sentence split across siblings.
      shallow.add(target);
      for (const node of record.addedNodes) {
        if (node instanceof Element) deep.add(node);
      }
    }
    for (const element of deep) {
      if (element.isConnected) translateTree(element);
    }
    for (const element of shallow) {
      if (!element.isConnected) continue;
      if (!isSkipped(element)) translateShallow(element);
      else if (element.tagName === "TEXTAREA") translateAttributes(element);
    }
    // Everything queued now came from our own writes above.
    observer.takeRecords();
  });
  observer.observe(document.body, {
    subtree: true,
    childList: true,
    characterData: true,
    attributes: true,
    attributeFilter: ATTRIBUTES,
  });

  const titleObserver = new MutationObserver(() => {
    translateTitle();
    titleObserver.takeRecords();
  });
  titleObserver.observe(document.head, {
    subtree: true,
    childList: true,
    characterData: true,
  });
}
