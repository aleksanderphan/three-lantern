// Lantern detail popup (image + caption)
export function createPopup({ onClose } = {}) {
  const popup = document.getElementById('popup');
  const imageWrap = popup.querySelector('.image-wrap');
  const image = document.getElementById('popupImage');
  const text = document.getElementById('popupText');
  const closeButton = document.getElementById('popupClose');

  image.addEventListener('load', () => imageWrap.classList.remove('loading'));
  image.addEventListener('error', () => imageWrap.classList.add('failed'));

  function open({ image: src, text: caption = '' }) {
    imageWrap.classList.remove('failed');
    imageWrap.classList.toggle('loading', Boolean(src));
    imageWrap.hidden = !src;
    if (src) {
      image.src = src;
      image.alt = caption;
      // Same src again (or cached) won't fire another load event
      if (image.complete && image.naturalWidth) imageWrap.classList.remove('loading');
    }
    text.textContent = caption;
    popup.hidden = false;
    document.body.classList.add('popup-open');
    closeButton.focus({ preventScroll: true });
  }

  function close() {
    if (popup.hidden) return;
    popup.hidden = true;
    document.body.classList.remove('popup-open');
    onClose?.();
  }

  closeButton.addEventListener('click', close);
  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') close();
  });

  return {
    open,
    close,
    get isOpen() {
      return !popup.hidden;
    },
  };
}
