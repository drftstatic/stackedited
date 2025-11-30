<template>
  <div class="splash-screen">
    <div class="splash-screen__inner">
      <div class="splash-screen__logo logo-background" />
      <div class="splash-screen__branding">
        <h1 class="splash-screen__title">StackediTED</h1>
        <p class="splash-screen__subtitle">a fever dream remix</p>
        <a href="https://fladrycreative.com" target="_blank" class="splash-screen__link">
          a fladry creative experiment
        </a>
      </div>
      <div class="splash-screen__loader">
        <div class="splash-screen__loader-bar" />
      </div>
    </div>
  </div>
</template>

<style lang="scss">
@import '../styles/variables.scss';

.splash-screen {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  padding: 25px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, $fever-ghost-white 0%, #fff 50%, rgba($fever-teal, 0.05) 100%);
  animation: splash-shimmer 3s ease-in-out infinite;

  .app--dark & {
    background: linear-gradient(135deg, $fever-ghost-dark 0%, #1e1e1e 50%, rgba($fever-purple, 0.08) 100%);
  }
}

@keyframes splash-shimmer {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.95;
  }
}

.splash-screen__inner {
  margin: 0 auto;
  max-width: 600px;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 24px;
}

.splash-screen__logo {
  width: 200px;
  height: 200px;
  filter: drop-shadow(0 0 20px rgba($fever-purple, 0.3));
  animation: float 6s ease-in-out infinite, pulse-glow 4s ease-in-out infinite;

  .app--dark & {
    filter: drop-shadow(0 0 20px rgba($fever-teal, 0.4));
    animation: float 6s ease-in-out infinite, pulse-glow-dark 4s ease-in-out infinite;
  }
}

@keyframes pulse-glow {
  0%, 100% {
    filter: drop-shadow(0 0 10px rgba($fever-purple, 0.3));
  }
  50% {
    filter: drop-shadow(0 0 30px rgba($fever-teal, 0.6));
  }
}

@keyframes pulse-glow-dark {
  0%, 100% {
    filter: drop-shadow(0 0 10px rgba($fever-teal, 0.3));
  }
  50% {
    filter: drop-shadow(0 0 30px rgba($fever-purple, 0.6));
  }
}

.splash-screen__branding {
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 8px;
  animation: fade-in 1s ease-in-out;
}

@keyframes fade-in {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.splash-screen__title {
  font-size: 48px;
  font-weight: 700;
  letter-spacing: 4px;
  margin: 0;
  background: linear-gradient(135deg, $fever-purple 0%, $fever-teal 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  animation: title-shimmer 3s ease-in-out infinite;

  .app--dark & {
    background: linear-gradient(135deg, $fever-teal 0%, $fever-purple 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
}

@keyframes title-shimmer {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.8;
  }
}

.splash-screen__subtitle {
  font-size: 16px;
  font-style: italic;
  letter-spacing: 2px;
  color: $fever-purple-deep;
  margin: 0;
  opacity: 0.7;

  .app--dark & {
    color: $fever-teal;
  }
}

.splash-screen__link {
  font-size: 12px;
  letter-spacing: 1px;
  text-transform: lowercase;
  color: $secondary-text-color;
  text-decoration: none;
  transition: all 0.3s ease;
  margin-top: 8px;

  &:hover {
    color: $fever-purple;
    transform: scale(1.05);
  }

  .app--dark &:hover {
    color: $fever-teal;
  }
}

.splash-screen__loader {
  width: 200px;
  height: 4px;
  background-color: rgba(0, 0, 0, 0.1);
  border-radius: 2px;
  overflow: hidden;
  animation: fade-in 1.5s ease-in-out;

  .app--dark & {
    background-color: rgba(255, 255, 255, 0.1);
  }
}

.splash-screen__loader-bar {
  height: 100%;
  background: linear-gradient(90deg, $fever-purple 0%, $fever-teal 50%, $fever-purple 100%);
  background-size: 200% 100%;
  border-radius: 2px;
  animation: loading 2s ease-in-out infinite;
  box-shadow: 0 0 10px rgba($fever-purple, 0.5);

  .app--dark & {
    background: linear-gradient(90deg, $fever-teal 0%, $fever-purple 50%, $fever-teal 100%);
    background-size: 200% 100%;
    box-shadow: 0 0 10px rgba($fever-teal, 0.5);
  }
}

@keyframes loading {
  0% {
    background-position: 0% 0%;
    transform: scaleX(0);
    transform-origin: left;
  }
  50% {
    background-position: 100% 0%;
    transform: scaleX(1);
    transform-origin: left;
  }
  51% {
    transform-origin: right;
  }
  100% {
    background-position: 200% 0%;
    transform: scaleX(0);
    transform-origin: right;
  }
}
</style>
