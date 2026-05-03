import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

export function createTextRevealAnimations() {
  const blocks = gsap.utils.toArray('.content-block');

  blocks.forEach((block) => {
    const section = block.closest('.scroll-section');

    gsap
      .timeline({
        scrollTrigger: {
          trigger: section,
          start: 'top 72%',
          end: 'bottom 28%',
          scrub: true,
        },
      })
      .fromTo(
        block,
        {
          autoAlpha: 0,
          y: 42,
        },
        {
          autoAlpha: 1,
          y: 0,
          duration: 0.35,
          ease: 'power2.out',
        }
      )
      .to(block, {
        autoAlpha: 1,
        y: 0,
        duration: 0.3,
        ease: 'none',
      })
      .to(block, {
        autoAlpha: 0,
        y: -34,
        duration: 0.35,
        ease: 'power2.in',
      });
  });
}

export function createScrollNarrative({
  orbitState,
  transitionState,
  progressSelector,
}) {
  const progressBar = document.querySelector(progressSelector);

  const timeline = gsap.timeline({
    defaults: {
      ease: 'none',
    },
    scrollTrigger: {
      trigger: '.experience',
      start: 'top top',
      end: 'bottom bottom',
      scrub: 1.15,
      onUpdate: (self) => {
        if (progressBar) {
          progressBar.style.transform = `scaleY(${self.progress})`;
        }
      },
    },
  });

  timeline.to(orbitState, {
    angle: Math.PI * 0.25,
    duration: 1,
  });

  timeline.to(orbitState, {
    angle: Math.PI * 0.5,
    duration: 1,
  });

  timeline.to(orbitState, {
    angle: Math.PI * 0.75,
    duration: 1,
  });

  timeline.to(orbitState, {
    angle: Math.PI,
    duration: 1,
  });

  timeline.to(transitionState, {
    blend: 1,
    duration: 1,
  });

  timeline.to(
    orbitState,
    {
      angle: Math.PI * 1.1,
      duration: 1,
    },
    '<'
  );

  timeline.to(orbitState, {
    angle: Math.PI * 1.4,
    duration: 1,
  });

  timeline.to(orbitState, {
    angle: Math.PI * 1.7,
    duration: 1,
  });

  timeline.to(orbitState, {
    angle: Math.PI * 2,
    duration: 1,
  });

  return timeline;
}

export function setLoaderProgress(progressBar, label, value) {
  const clampedValue = gsap.utils.clamp(0, 1, value);

  progressBar.style.transform = `scaleX(${clampedValue})`;
  label.textContent = `${Math.round(clampedValue * 100)}%`;
}

export function hideLoader(loader) {
  gsap.to(loader, {
    autoAlpha: 0,
    duration: 0.9,
    ease: 'power2.out',
    onComplete: () => {
      loader.setAttribute('aria-hidden', 'true');
      loader.style.pointerEvents = 'none';
    },
  });
}
