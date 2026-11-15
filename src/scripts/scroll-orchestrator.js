/**
 * scroll-orchestrator.js
 * Global scroll animation coordinator for Ember & Ink.
 * Runs once on page load. Coordinates reveal animations
 * for all 7 immersive scenes with mobile performance tuning.
 */
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

// Prevent mobile address bar show/hide from triggering full layout recalculation
ScrollTrigger.config({
  limitCallbacks: true,
  ignoreMobileResize: true,
});

function initScrollOrchestrator() {
  if (typeof window === 'undefined') return;

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    // Show all elements immediately
    document.querySelectorAll('.scene-reveal, .reveal-up, .reveal-fade, .stagger-reveal > *, .scene-eyebrow, .scene-headline, .reveal-line').forEach((el) => {
      el.style.opacity = '1';
      el.style.transform = 'none';
    });
    return;
  }

  const isMobile = window.innerWidth < 768;
  const yDist = isMobile ? 24 : 50;
  const dur = isMobile ? 0.65 : 1.0;

  // Generic reveal-up: slides up + fades in
  gsap.utils.toArray('.reveal-up').forEach((elem) => {
    gsap.fromTo(elem,
      { y: yDist, opacity: 0 },
      {
        y: 0, opacity: 1,
        duration: dur, ease: 'power2.out',
        scrollTrigger: { trigger: elem, start: 'top 88%', once: true }
      }
    );
  });

  // Generic reveal-fade: fades in only
  gsap.utils.toArray('.reveal-fade').forEach((elem) => {
    gsap.fromTo(elem,
      { opacity: 0 },
      {
        opacity: 1, duration: dur * 1.1, ease: 'power2.out',
        scrollTrigger: { trigger: elem, start: 'top 90%', once: true }
      }
    );
  });

  // Stagger reveal: children animate in sequence
  gsap.utils.toArray('.stagger-reveal').forEach((container) => {
    const children = container.querySelectorAll(':scope > *');
    gsap.fromTo(children,
      { y: isMobile ? 20 : 40, opacity: 0 },
      {
        y: 0, opacity: 1,
        duration: dur * 0.85,
        stagger: isMobile ? 0.05 : 0.08,
        ease: 'power2.out',
        scrollTrigger: { trigger: container, start: 'top 85%', once: true }
      }
    );
  });

  // Scene eyebrow labels (small uppercase text above headings)
  gsap.utils.toArray('.scene-eyebrow').forEach((elem) => {
    gsap.fromTo(elem,
      { opacity: 0, y: isMobile ? 10 : 16 },
      {
        opacity: 1, y: 0,
        duration: dur * 0.9, ease: 'power2.out',
        scrollTrigger: { trigger: elem, start: 'top 90%', once: true }
      }
    );
  });

  // Large headline reveals
  gsap.utils.toArray('.scene-headline').forEach((elem) => {
    gsap.fromTo(elem,
      { y: yDist, opacity: 0 },
      {
        y: 0, opacity: 1,
        duration: dur * 1.1, ease: 'power2.out',
        scrollTrigger: { trigger: elem, start: 'top 85%', once: true }
      }
    );
  });

  // Horizontal line decorators
  gsap.utils.toArray('.reveal-line').forEach((line) => {
    gsap.fromTo(line,
      { scaleX: 0, transformOrigin: 'left' },
      {
        scaleX: 1, duration: dur * 0.9, ease: 'power2.inOut',
        scrollTrigger: { trigger: line, start: 'top 92%', once: true }
      }
    );
  });
}

document.addEventListener('DOMContentLoaded', initScrollOrchestrator);
document.addEventListener('astro:page-load', initScrollOrchestrator);
