import * as THREE from 'three';

// Shared LoadingManager wired to the #loader overlay
export function createLoadingManager() {
  const loader = document.getElementById('loader');
  const text = document.getElementById('progress-text');
  const bar = document.getElementById('progress-bar');
  const manager = new THREE.LoadingManager();

  manager.onProgress = (url, loaded, total) => {
    const progress = Math.round((loaded / total) * 100);
    text.textContent = `Loading ${progress}%`;
    bar.style.transform = `scaleX(${progress / 100})`;
  };

  manager.onLoad = () => {
    loader.classList.add('hidden');
    setTimeout(() => loader.remove(), 800);
  };

  manager.onError = (url) => {
    console.error('Failed to load', url);
  };

  return manager;
}

// Show a message in the loader when startup fails
export function showLoadError(message) {
  const text = document.getElementById('progress-text');
  if (text) text.textContent = message;
  document.getElementById('loader')?.classList.add('error');
}
