/*
 * CRO: Shop Pay express checkout in the cart drawer.
 *
 * The cart drawer is the Rebuy Smart Cart (rendered by Rebuy's JS, not by the
 * theme). The Shop Pay link from snippets/cro-express-pay.liquid (an inert
 * <template> on every page) is cloned right after the drawer's Checkout button
 * as soon as the drawer renders, and re-inserted if Rebuy re-renders.
 * No network request, so it appears together with the drawer.
 *
 * Visibility is controlled by CSS only (assets/custom.css). No A/B logic here.
 */
(function() {
  var template = document.getElementById('CroExpressPayTemplate');
  if (!template) return;

  var selectors = {
    actions: '.rebuy-cart__flyout-actions',
    checkout: '.rebuy-cart__checkout-button',
    wrapper: '.cro-express-pay'
  };
  var scheduled = false;

  // Insert the wrapper directly after the Checkout button (once per render)
  function place() {
    scheduled = false;
    var actions = document.querySelector(selectors.actions);
    if (!actions) return;

    var checkout = actions.querySelector(selectors.checkout);
    var current = actions.querySelector(selectors.wrapper);

    if (!actions.classList.contains('cro-checkout-row')) {
      actions.classList.add('cro-checkout-row');
      actions.setAttribute('data-cro', 'checkout-row');
    }

    if (!checkout) return;
    if (current && current.previousElementSibling === checkout) return;
    if (current) current.parentNode.removeChild(current);
    checkout.insertAdjacentElement('afterend', template.content.firstElementChild.cloneNode(true));
  }

  function schedule() {
    if (scheduled) return;
    scheduled = true;
    window.requestAnimationFrame(place);
  }

  new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true });
  schedule();

  /*
   * Force the redirect with JS. A plain link can silently do nothing when Rebuy
   * re-renders the footer between press and release (the browser then fires no
   * click), and the shop.app redirect takes a moment with no feedback. Handled
   * on document (capture) so it works whichever button node is current.
   */
  var BUTTON = '.cro-shop-pay-btn';
  var href = template.content.querySelector(BUTTON).getAttribute('href');
  var pressed = null;
  var redirecting = false;

  function setLoading(on) {
    document.querySelectorAll(BUTTON).forEach(function(btn) {
      btn.classList.toggle('is-loading', on);
      if (on) btn.setAttribute('aria-busy', 'true'); else btn.removeAttribute('aria-busy');
    });
  }

  function redirect(evt) {
    evt.preventDefault();
    if (redirecting) return;
    redirecting = true;
    setLoading(true);
    window.location.assign(href);
    // Let the shopper retry if navigation never happened
    setTimeout(function() {
      redirecting = false;
      setLoading(false);
    }, 5000);
  }

  function isModified(evt) {
    return evt.metaKey || evt.ctrlKey || evt.shiftKey || evt.altKey || (evt.button && evt.button !== 0);
  }

  document.addEventListener('pointerdown', function(evt) {
    pressed = evt.target.closest ? evt.target.closest(BUTTON) : null;
  }, true);

  document.addEventListener('pointercancel', function() {
    pressed = null;
  }, true);

  document.addEventListener('pointerup', function(evt) {
    if (!pressed) return;
    var wasReplaced = !pressed.isConnected;
    var onButton = evt.target.closest && evt.target.closest(BUTTON);
    pressed = null;
    if (isModified(evt) || !(onButton || wasReplaced)) return;
    redirect(evt);
  }, true);

  // Keyboard activation, and suppress the native link click after pointerup
  document.addEventListener('click', function(evt) {
    if (!(evt.target.closest && evt.target.closest(BUTTON)) || isModified(evt)) return;
    redirect(evt);
  }, true);

  // Returning via the back button (bfcache): clear the loading state
  window.addEventListener('pageshow', function() {
    redirecting = false;
    setLoading(false);
  });
})();
