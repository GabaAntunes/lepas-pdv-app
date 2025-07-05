
"use client";

import { cn } from "@/lib/utils";
import { motion, useInView } from "framer-motion";
import { useRef, type ReactNode, ElementType } from "react";

interface BlurFadeProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  inView?: boolean;
  as?: ElementType;
}

export function BlurFade({
  children,
  className,
  delay = 0,
  inView: inViewProp,
  as: Comp = "div",
}: BlurFadeProps) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const inView = inViewProp ?? isInView;

  const variants = {
    hidden: { opacity: 0, filter: "blur(5px)", y: 10 },
    visible: { opacity: 1, filter: "blur(0px)", y: 0 },
  };

  const MotionComp = motion(Comp);

  return (
    <MotionComp
      ref={ref}
      initial="hidden"
      animate={inView ? "visible" : "hidden"}
      variants={variants}
      transition={{
        duration: 0.2,
        delay,
        ease: "easeOut",
      }}
      className={cn(className)}
    >
      {children}
    </MotionComp>
  );
}
