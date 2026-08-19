import { useEffect, useRef, useState } from 'react';
import { Spinner } from '@librechat/client';

/**
 * Purely cosmetic filler words shown while a response streams, so the UI
 * reads as more alive than a bare cursor during long generations. Not
 * localized on purpose — translating a 100-entry whimsical list isn't
 * worth the churn for what is deliberately throwaway flavor text.
 */
const FUNNY_VERBS = [
  'Pondering',
  'Noodling',
  'Percolating',
  'Ruminating',
  'Marinating',
  'Cogitating',
  'Contemplating',
  'Deliberating',
  'Mulling',
  'Musing',
  'Brainstorming',
  'Puzzling',
  'Wondering',
  'Daydreaming',
  'Doodling',
  'Scribbling',
  'Sketching',
  'Tinkering',
  'Fiddling',
  'Wrangling',
  'Juggling',
  'Untangling',
  'Unscrambling',
  'Unjumbling',
  'Decoding',
  'Deciphering',
  'Divining',
  'Conjuring',
  'Summoning',
  'Channeling',
  'Manifesting',
  'Materializing',
  'Levitating',
  'Teleporting',
  'Orbiting',
  'Calibrating',
  'Tuning',
  'Synchronizing',
  'Aligning',
  'Assembling',
  'Forging',
  'Hammering',
  'Welding',
  'Soldering',
  'Chiseling',
  'Sculpting',
  'Polishing',
  'Buffing',
  'Sanding',
  'Whittling',
  'Kneading',
  'Whisking',
  'Folding',
  'Basting',
  'Simmering',
  'Brewing',
  'Steeping',
  'Fermenting',
  'Distilling',
  'Refining',
  'Caramelizing',
  'Toasting',
  'Marinading',
  'Pickling',
  'Bottling',
  'Corking',
  'Uncorking',
  'Popping',
  'Fizzing',
  'Bubbling',
  'Sparkling',
  'Sprinkling',
  'Dusting',
  'Buttering',
  'Sugarcoating',
  'Spicing',
  'Seasoning',
  'Garnishing',
  'Plating',
  'Whipping',
  'Beating',
  'Blending',
  'Churning',
  'Grinding',
  'Milling',
  'Sifting',
  'Straining',
  'Filtering',
  'Distributing',
  'Shuffling',
  'Sorting',
  'Untying',
  'Threading',
  'Weaving',
  'Braiding',
  'Knitting',
  'Stitching',
  'Embroidering',
  'Crocheting',
  'Quilting',
] as const;

const ROTATE_INTERVAL_MS = 5000;
const TYPE_CHAR_INTERVAL_MS = 35;

function randomVerb(): string {
  return FUNNY_VERBS[Math.floor(Math.random() * FUNNY_VERBS.length)];
}

function nextVerb(previous: string): string {
  let candidate = previous;
  while (candidate === previous) {
    candidate = randomVerb();
  }
  return candidate;
}

export default function StreamingStatusIndicator() {
  const [verb, setVerb] = useState(randomVerb);
  const [typedLength, setTypedLength] = useState(0);
  const reduceMotion = useRef(
    typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true,
  ).current;

  useEffect(() => {
    const id = setInterval(() => {
      setVerb((current) => nextVerb(current));
    }, ROTATE_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (reduceMotion) {
      setTypedLength(verb.length);
      return;
    }
    setTypedLength(0);
    const id = setInterval(() => {
      setTypedLength((current) => {
        if (current >= verb.length) {
          clearInterval(id);
          return current;
        }
        return current + 1;
      });
    }, TYPE_CHAR_INTERVAL_MS);
    return () => clearInterval(id);
  }, [verb, reduceMotion]);

  return (
    <div
      className="mt-1 flex h-[31px] items-center gap-2 text-base text-text-secondary"
      role="status"
    >
      <Spinner className="size-4" />
      <span aria-hidden="true">
        {verb.slice(0, typedLength)}&hellip;
      </span>
      <span className="sr-only" aria-live="polite">
        {verb}&hellip;
      </span>
    </div>
  );
}
