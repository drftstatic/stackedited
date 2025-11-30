<template>
  <div class="splash-screen">
    <!-- Noise overlay for texture -->
    <div class="splash-screen__noise" />

    <!-- Scanline effect -->
    <div class="splash-screen__scanlines" />

    <div class="splash-screen__inner">
      <!-- Glitchy logo with RGB split -->
      <div class="splash-screen__logo-container">
        <div class="splash-screen__logo logo-background" />
        <div class="splash-screen__logo-glitch splash-screen__logo-glitch--r logo-background" />
        <div class="splash-screen__logo-glitch splash-screen__logo-glitch--b logo-background" />
      </div>

      <div class="splash-screen__branding">
        <!-- Glitchy title with data attribute for pseudo effect -->
        <h1 class="splash-screen__title" data-text="StackediTED">
          <span class="splash-screen__title-main">Stackedi</span><span class="splash-screen__title-ted">TED</span>
        </h1>

        <p class="splash-screen__subtitle">
          <span class="splash-screen__subtitle-glitch">a fever dream remix</span>
        </p>

        <a href="https://fladrycreative.com" target="_blank" class="splash-screen__link">
          <span class="splash-screen__link-bracket">[</span>
          a fladry creative experiment
          <span class="splash-screen__link-bracket">]</span>
        </a>
      </div>

      <!-- Dramatic loader -->
      <div class="splash-screen__loader">
        <div class="splash-screen__loader-track">
          <div class="splash-screen__loader-bar" />
          <div class="splash-screen__loader-glow" />
        </div>
        <div class="splash-screen__loader-text">initializing consciousness...</div>
      </div>
    </div>

    <!-- Floating glitch fragments -->
    <div class="splash-screen__fragments">
      <div class="splash-screen__fragment splash-screen__fragment--1" />
      <div class="splash-screen__fragment splash-screen__fragment--2" />
      <div class="splash-screen__fragment splash-screen__fragment--3" />
    </div>
  </div>
</template>

<style lang="scss">
@import '../styles/variables.scss';

// ═══════════════════════════════════════════════════════════════
// SPLASH SCREEN - The fever dream awakens
// ═══════════════════════════════════════════════════════════════

.splash-screen {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(
    145deg,
    $fever-ghost-white 0%,
    #fff 30%,
    rgba($fever-purple, 0.03) 70%,
    rgba($fever-teal, 0.05) 100%
  );
  overflow: hidden;

  .app--dark & {
    background: linear-gradient(
      145deg,
      $fever-ghost-abyss 0%,
      $fever-ghost-dark 40%,
      rgba($fever-purple, 0.1) 80%,
      rgba($fever-teal, 0.05) 100%
    );
  }
}

// Noise texture overlay
.splash-screen__noise {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  opacity: 0.03;
  background-image: $noise-pattern;
  pointer-events: none;
  z-index: 10;

  .app--dark & {
    opacity: 0.05;
  }
}

// CRT scanlines
.splash-screen__scanlines {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: $scanlines;
  pointer-events: none;
  z-index: 11;
  opacity: 0.5;

  .app--dark & {
    opacity: 0.3;
  }
}

.splash-screen__inner {
  position: relative;
  z-index: 20;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 32px;
  padding: 40px;
}

// ───────────────────────────────────────────────────────────────
// LOGO - RGB split glitch effect
// ───────────────────────────────────────────────────────────────

.splash-screen__logo-container {
  position: relative;
  width: 180px;
  height: 180px;
}

.splash-screen__logo {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  filter: drop-shadow(0 0 30px rgba($fever-purple, 0.4));
  animation:
    float 6s ease-in-out infinite,
    pulse-glow 4s ease-in-out infinite;

  .app--dark & {
    filter: drop-shadow(0 0 30px rgba($fever-teal, 0.5));
  }
}

.splash-screen__logo-glitch {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  animation: glitch-rgb 8s infinite;

  &--r {
    filter: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg"><defs><filter id="r"><feColorMatrix type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0"/></filter></defs></svg>#r');
    animation-delay: 0s;
  }

  &--b {
    filter: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg"><defs><filter id="b"><feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0"/></filter></defs></svg>#b');
    animation-delay: 0.05s;
  }
}

@keyframes glitch-rgb {
  0%, 90%, 100% {
    opacity: 0;
    transform: translate(0, 0);
  }
  92% {
    opacity: 0.8;
    transform: translate(-3px, 1px);
  }
  94% {
    opacity: 0.6;
    transform: translate(2px, -1px);
  }
  96% {
    opacity: 0.4;
    transform: translate(-1px, 2px);
  }
  98% {
    opacity: 0.2;
    transform: translate(1px, -2px);
  }
}

@keyframes float {
  0%, 100% {
    transform: translateY(0) rotate(0deg);
  }
  25% {
    transform: translateY(-8px) rotate(0.5deg);
  }
  50% {
    transform: translateY(-12px) rotate(0deg);
  }
  75% {
    transform: translateY(-6px) rotate(-0.5deg);
  }
}

@keyframes pulse-glow {
  0%, 100% {
    filter: drop-shadow(0 0 20px rgba($fever-purple, 0.3));
  }
  50% {
    filter: drop-shadow(0 0 40px rgba($fever-teal, 0.5));
  }
}

// ───────────────────────────────────────────────────────────────
// BRANDING - Typography with glitch personality
// ───────────────────────────────────────────────────────────────

.splash-screen__branding {
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.splash-screen__title {
  font-family: $font-family-display;
  font-size: clamp(36px, 8vw, 64px);
  font-weight: 800;
  letter-spacing: 3px;
  margin: 0;
  position: relative;
  line-height: $line-height-tight;

  // Glitch pseudo-element effect
  &::before,
  &::after {
    content: attr(data-text);
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    opacity: 0;
  }

  &::before {
    color: $fever-coral;
    animation: glitch-text 3s infinite;
    clip-path: polygon(0 0, 100% 0, 100% 45%, 0 45%);
  }

  &::after {
    color: $fever-teal;
    animation: glitch-text 3s infinite reverse;
    clip-path: polygon(0 55%, 100% 55%, 100% 100%, 0 100%);
  }
}

.splash-screen__title-main {
  background: linear-gradient(135deg, $fever-purple 0%, $fever-purple-deep 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;

  .app--dark & {
    background: linear-gradient(135deg, $fever-teal-light 0%, $fever-teal 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
}

.splash-screen__title-ted {
  background: linear-gradient(135deg, $fever-teal 0%, $fever-teal-dark 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  position: relative;

  // Subtle underline accent
  &::after {
    content: '';
    position: absolute;
    bottom: 2px;
    left: 0;
    width: 100%;
    height: 3px;
    background: linear-gradient(90deg, $fever-teal, $fever-purple);
    border-radius: 2px;
    opacity: 0.6;
  }

  .app--dark & {
    background: linear-gradient(135deg, $fever-purple-light 0%, $fever-purple 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;

    &::after {
      background: linear-gradient(90deg, $fever-purple, $fever-teal);
    }
  }
}

@keyframes glitch-text {
  0%, 85%, 100% {
    opacity: 0;
    transform: translate(0, 0);
  }
  86% {
    opacity: 0.8;
    transform: translate(-2px, 0);
  }
  88% {
    opacity: 0.4;
    transform: translate(2px, 0);
  }
  90% {
    opacity: 0.6;
    transform: translate(-1px, 0);
  }
}

.splash-screen__subtitle {
  font-family: $font-family-ui;
  font-size: 18px;
  font-weight: 400;
  letter-spacing: 4px;
  text-transform: lowercase;
  margin: 0;
  color: $fever-purple-deep;
  opacity: 0.8;
  animation: fade-in 1s ease-out 0.3s both;

  .app--dark & {
    color: $fever-teal-light;
  }
}

.splash-screen__subtitle-glitch {
  display: inline-block;
  position: relative;

  &::before {
    content: 'a fever dream remix';
    position: absolute;
    left: 0;
    top: 0;
    color: $fever-teal;
    opacity: 0;
    animation: subtitle-glitch 5s infinite;
  }
}

@keyframes subtitle-glitch {
  0%, 95%, 100% {
    opacity: 0;
    transform: translateX(0);
  }
  96% {
    opacity: 0.5;
    transform: translateX(-2px);
  }
  97% {
    opacity: 0.3;
    transform: translateX(1px);
  }
  98% {
    opacity: 0.5;
    transform: translateX(-1px);
  }
}

.splash-screen__link {
  font-family: $font-family-monospace;
  font-size: 11px;
  letter-spacing: 1px;
  text-transform: lowercase;
  color: $secondary-text-color;
  text-decoration: none;
  transition: all $transition-base;
  margin-top: 8px;
  animation: fade-in 1s ease-out 0.5s both;
  display: inline-flex;
  align-items: center;
  gap: 4px;

  &:hover {
    color: $fever-purple;
    transform: scale(1.02);

    .splash-screen__link-bracket {
      color: $fever-teal;
    }
  }

  .app--dark & {
    color: rgba(255, 255, 255, 0.5);

    &:hover {
      color: $fever-teal;

      .splash-screen__link-bracket {
        color: $fever-purple;
      }
    }
  }
}

.splash-screen__link-bracket {
  color: $fever-purple;
  transition: color $transition-base;
  font-weight: 500;

  .app--dark & {
    color: $fever-teal;
  }
}

@keyframes fade-in {
  from {
    opacity: 0;
    transform: translateY(15px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

// ───────────────────────────────────────────────────────────────
// LOADER - Dramatic progress indicator
// ───────────────────────────────────────────────────────────────

.splash-screen__loader {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  animation: fade-in 1s ease-out 0.7s both;
}

.splash-screen__loader-track {
  width: 240px;
  height: 4px;
  background-color: rgba($fever-purple, 0.15);
  border-radius: 2px;
  overflow: visible;
  position: relative;

  .app--dark & {
    background-color: rgba($fever-teal, 0.15);
  }
}

.splash-screen__loader-bar {
  height: 100%;
  background: linear-gradient(
    90deg,
    $fever-purple 0%,
    $fever-teal 50%,
    $fever-purple 100%
  );
  background-size: 200% 100%;
  border-radius: 2px;
  animation: loading-bar 2s ease-in-out infinite;
  position: relative;

  .app--dark & {
    background: linear-gradient(
      90deg,
      $fever-teal 0%,
      $fever-purple 50%,
      $fever-teal 100%
    );
    background-size: 200% 100%;
  }
}

.splash-screen__loader-glow {
  position: absolute;
  top: -4px;
  left: 0;
  width: 30%;
  height: 12px;
  background: radial-gradient(ellipse, rgba($fever-purple, 0.6) 0%, transparent 70%);
  border-radius: 50%;
  animation: loading-glow 2s ease-in-out infinite;
  filter: blur(4px);

  .app--dark & {
    background: radial-gradient(ellipse, rgba($fever-teal, 0.6) 0%, transparent 70%);
  }
}

@keyframes loading-bar {
  0% {
    width: 0%;
    background-position: 0% 0%;
  }
  50% {
    width: 100%;
    background-position: 100% 0%;
  }
  51% {
    width: 100%;
  }
  100% {
    width: 0%;
    margin-left: 100%;
    background-position: 200% 0%;
  }
}

@keyframes loading-glow {
  0% {
    left: -10%;
    opacity: 0;
  }
  10% {
    opacity: 1;
  }
  50% {
    left: 80%;
    opacity: 1;
  }
  90% {
    opacity: 1;
  }
  100% {
    left: 110%;
    opacity: 0;
  }
}

.splash-screen__loader-text {
  font-family: $font-family-monospace;
  font-size: 10px;
  letter-spacing: 2px;
  text-transform: lowercase;
  color: $secondary-text-color;
  animation: text-flicker 4s infinite;

  .app--dark & {
    color: rgba(255, 255, 255, 0.4);
  }
}

@keyframes text-flicker {
  0%, 100% {
    opacity: 0.6;
  }
  50% {
    opacity: 1;
  }
  52% {
    opacity: 0.4;
  }
  54% {
    opacity: 0.9;
  }
}

// ───────────────────────────────────────────────────────────────
// FLOATING FRAGMENTS - Background visual interest
// ───────────────────────────────────────────────────────────────

.splash-screen__fragments {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  pointer-events: none;
  z-index: 5;
}

.splash-screen__fragment {
  position: absolute;
  border-radius: 2px;
  opacity: 0.1;
  animation: fragment-drift 20s linear infinite;

  &--1 {
    top: 20%;
    left: 10%;
    width: 60px;
    height: 3px;
    background: linear-gradient(90deg, $fever-purple, transparent);
    animation-duration: 25s;
    animation-delay: 0s;
  }

  &--2 {
    top: 60%;
    right: 15%;
    width: 40px;
    height: 2px;
    background: linear-gradient(90deg, transparent, $fever-teal);
    animation-duration: 18s;
    animation-delay: -5s;
  }

  &--3 {
    bottom: 25%;
    left: 25%;
    width: 80px;
    height: 1px;
    background: linear-gradient(90deg, $fever-purple, $fever-teal, transparent);
    animation-duration: 22s;
    animation-delay: -10s;
  }
}

@keyframes fragment-drift {
  0% {
    transform: translateX(-100px) translateY(0) rotate(0deg);
    opacity: 0;
  }
  10% {
    opacity: 0.15;
  }
  50% {
    opacity: 0.1;
  }
  90% {
    opacity: 0.15;
  }
  100% {
    transform: translateX(100vw) translateY(-20px) rotate(5deg);
    opacity: 0;
  }
}
</style>
