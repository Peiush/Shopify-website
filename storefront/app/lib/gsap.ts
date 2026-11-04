import gsap from 'gsap';
import {ScrollTrigger} from 'gsap/ScrollTrigger';
import {SplitText} from 'gsap/SplitText';
import {DrawSVGPlugin} from 'gsap/DrawSVGPlugin';
import {useGSAP} from '@gsap/react';

// Register once, in the browser only (GSAP must never run during SSR).
if (typeof window !== 'undefined') {
  gsap.registerPlugin(useGSAP, ScrollTrigger, SplitText, DrawSVGPlugin);
  gsap.defaults({ease: 'power3.out', duration: 0.9});
}

/** Shared matchMedia conditions: every animation checks `reduceMotion`. */
export const MOTION_QUERIES = {
  isDesktop: '(min-width: 768px)',
  isMobile: '(max-width: 767px)',
  reduceMotion: '(prefers-reduced-motion: reduce)',
};

export {gsap, ScrollTrigger, SplitText, useGSAP};
