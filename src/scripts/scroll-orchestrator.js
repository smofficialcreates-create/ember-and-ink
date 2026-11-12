/**
 * scroll-orchestrator.js
 * Global scroll animation coordinator for Ember & Ink.
 * Runs once on page load. Coordinates reveal animations
 * for all 7 immersive scenes.
 */
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

function initScrollOrchestrator() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    // Show all hidden elements immediately
    document.querySelectorAll('.scene-reveal, .reveal-up, .reveal-fade, .stagger-reveal > *').forEach((el) => {
      el.style.opacity = '1';
      el.style.transform = 'none';
    });
    return;
  }

  // Generic reveal-up: slides up + fades in
  gsap.utils.toArray('.reveal-up').forEach((elem) => {
    gsap.fromTo(elem,
      { y: 60, opacity: 0 },
      {
        y: 0, opacity: 1,
        duration: 1.0, ease: 'power3.out',
        scrollTrigger: { trigger: elem, start: 'top 85%', once: true }
      }
    );
  });

  // Generic reveal-fade: fades in only
  gsap.utils.toArray('.reveal-fade').forEach((elem) => {
    gsap.fromTo(elem,
      { opacity: 0 },
      {
        opacity: 1, duration: 1.2, ease: 'power2.out',
        scrollTrigger: { trigger: elem, start: 'top 88%', once: true }
      }
    );
  });

  // Stagger reveal: children animate in sequence
  gsap.utils.toArray('.stagger-reveal').forEach((container) => {
    const children = container.querySelectorAll(':scope > *');
    gsap.fromTo(children,
      { y: 48, opacity: 0 },
      {
        y: 0, opacity: 1,
        duration: 0.85,
        stagger: 0.09,
        ease: 'power3.out',
        scrollTrigger: { trigger: container, start: 'top 82%', once: true }
      }
    );
  });

  // Scene eyebrow labels (small uppercase text above headings)
  gsap.utils.toArray('.scene-eyebrow').forEach((elem) => {
    gsap.fromTo(elem,
      { opacity: 0, letterSpacing: '0.6em' },
      {
        opacity: 1, letterSpacing: '',
        duration: 1.1, ease: 'power2.out',
        scrollTrigger: { trigger: elem, start: 'top 88%', once: true }
      }
    );
  });

  // Large headline reveals (split into lines)
  gsap.utils.toArray('.scene-headline').forEach((elem) => {
    gsap.fromTo(elem,
      { y: 50, opacity: 0, skewX: -1.5 },
      {
        y: 0, opacity: 1, skewX: 0,
        duration: 1.2, ease: 'expo.out',
        scrollTrigger: { trigger: elem, start: 'top 82%', once: true }
      }
    );
  });

  // Horizontal line decorators
  gsap.utils.toArray('.reveal-line').forEach((line) => {
    gsap.fromTo(line,
      { scaleX: 0, transformOrigin: 'left' },
      {
        scaleX: 1, duration: 1.1, ease: 'power3.inOut',
        scrollTrigger: { trigger: line, start: 'top 90%', once: true }
      }
    );
  });
}

document.addEventListener('DOMContentLoaded', initScrollOrchestrator);
document.addEventListener('astro:page-load', initScrollOrchestrator);
