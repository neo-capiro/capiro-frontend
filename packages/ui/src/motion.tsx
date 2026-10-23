"use client";
import { motion, useReducedMotion, type HTMLMotionProps } from "motion/react";
export { AnimatePresence } from "motion/react";
/** Figma shared Motion3141:40968: production plays once; unknown preference is reduced. */
export function MotionSurface(props: HTMLMotionProps<"div">) {
  const reduced = useReducedMotion() !== false;
  return (
    <motion.div
      initial={{ opacity: 0, y: reduced ? 0 : 8 }}
      animate={{
        opacity: 1,
        y: 0,
        transition: { duration: reduced ? 0.12 : 0.18, ease: [0, 0, 0.2, 1] },
      }}
      exit={{ opacity: 0, y: 0, transition: { duration: 0.12 } }}
      {...props}
    />
  );
}
