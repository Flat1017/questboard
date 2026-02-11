import { PIN_VARIANTS, PARCHMENT_VARIANTS } from "@/lib/constants";
import type { PinVariant } from "@/types/domain";

export function createQuestVisualSeed(): {
  parchment_variant: number;
  pin_variant: PinVariant;
  pin_offset_px: number;
} {
  const parchment_variant = Math.floor(Math.random() * PARCHMENT_VARIANTS) + 1;
  const pin_variant = PIN_VARIANTS[Math.floor(Math.random() * PIN_VARIANTS.length)] as PinVariant;
  const pin_offset_px = Math.floor(Math.random() * 11) - 5;
  return { parchment_variant, pin_variant, pin_offset_px };
}
