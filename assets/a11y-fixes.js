/*
 * ADA: patches for markup injected by third-party apps that the theme can't
 * edit directly. Runs on load and again whenever the apps re-render.
 *
 * - ProtectMyOrder (Mule) toggle in the Rebuy cart: its <label> is empty and
 *   points at a non-existent id, so the checkbox has no accessible name.
 * - ProtectMyOrder info modal: footer contains an empty <a href="#">.
 * - Rebuy bundle widget on PDP: .rebuy-checkbox label has no text.
 * - Rapid Search overlay: input has no label, search/close buttons are icon-only.
 * - Incubate collection add-to-cart: card quantity inputs and variant selects have no label.
 * - hCaptcha/reCAPTCHA: hidden response textarea has no label (WAVE "Missing form label").
 */
(function() {
  var scheduled = false;

  // Rapid Search overlay elements -> accessible name to add when the app leaves them nameless
  var rapidSearchLabels = [
    ['.rps_search_overlay_input', 'Search our store'],
    ['.rps_search_overlay_search_button', 'Search'],
    ['.rps_search_overlay_close', 'Close search'],
    // Shopify's hCaptcha on contact/newsletter forms injects a hidden, nameless response textarea
    ['textarea[name="h-captcha-response"]', 'hCaptcha response'],
    ['textarea[name="g-recaptcha-response"]', 'reCAPTCHA response']
  ];

  function hasName(el) {
    if (el.getAttribute('aria-label') || el.getAttribute('aria-labelledby') || el.getAttribute('title')) return true;
    if (el.labels && el.labels.length) return true;
    // Form fields don't get a name from their content (a select's option text doesn't count)
    if (el.tagName === 'INPUT' || el.tagName === 'SELECT' || el.tagName === 'TEXTAREA') return false;
    return el.textContent.trim() !== '';
  }

  function cardTitleFor(el) {
    var card = el.closest('.grid-product, .grid__item');
    var title = card && card.querySelector('.grid-product__title');
    return title && title.textContent.trim();
  }

  function fix() {
    scheduled = false;

    for (var k = 0; k < rapidSearchLabels.length; k++) {
      var els = document.querySelectorAll(rapidSearchLabels[k][0]);
      for (var m = 0; m < els.length; m++) {
        if (!hasName(els[m])) els[m].setAttribute('aria-label', rapidSearchLabels[k][1]);
      }
    }

    var toggles = document.querySelectorAll('#muleOrderProtection');
    for (var i = 0; i < toggles.length; i++) {
      var input = toggles[i];
      var label = input.closest('label');
      if (!label) {
        input.setAttribute('aria-label', 'Add ProtectMyOrder package protection');
        continue;
      }
      if (label.getAttribute('for') !== input.id) {
        label.setAttribute('for', input.id);
      }
      // Label must contain text itself (WAVE "Empty form label"); keep it visually hidden
      if (!label.querySelector('.a11y-label-text')) {
        var text = document.createElement('span');
        text.className = 'a11y-label-text visually-hidden';
        text.textContent = 'Add ProtectMyOrder package protection';
        label.appendChild(text);
      }
      input.removeAttribute('aria-label');
    }

    // Rebuy bundle/FBT widget: <label> wraps the checkbox but has only an icon, no text
    var rebuyChecks = document.querySelectorAll('input.rebuy-checkbox');
    for (var r = 0; r < rebuyChecks.length; r++) {
      var check = rebuyChecks[r];
      var rebuyLabel = check.closest('label');
      var block = check.closest('.rebuy-product-block');
      var titleEl = block && block.querySelector('.rebuy-product-title');
      var title = titleEl && titleEl.textContent.trim();
      var name = title ? 'Select ' + title : 'Select this product';
      if (!rebuyLabel) {
        check.setAttribute('aria-label', name);
        continue;
      }
      var span = rebuyLabel.querySelector('.a11y-label-text');
      if (!span) {
        span = document.createElement('span');
        span.className = 'a11y-label-text visually-hidden';
        rebuyLabel.appendChild(span);
      }
      // Widget can swap products in place, so keep the text in sync
      if (span.textContent !== name) span.textContent = name;
    }

    // Incubate collection add-to-cart app: quantity inputs and variant selects on product cards have no label
    var qtyInputs = document.querySelectorAll(
      '[class*="incubate-collections-add-to-cart-quantity"] input, input[class*="incubate-collections-add-to-cart-quantity"]'
    );
    for (var q = 0; q < qtyInputs.length; q++) {
      var qty = qtyInputs[q];
      if (qty.type === 'hidden' || hasName(qty)) continue;
      var productName = cardTitleFor(qty);
      qty.setAttribute('aria-label', productName ? 'Quantity for ' + productName : 'Quantity');
    }

    var cardSelects = document.querySelectorAll(
      '[class*="incubate-collections-add-to-cart"] select, select[class*="incubate-collections-add-to-cart"], .grid-product select'
    );
    for (var s = 0; s < cardSelects.length; s++) {
      var select = cardSelects[s];
      if (hasName(select)) continue;
      var selectProduct = cardTitleFor(select);
      select.setAttribute('aria-label', selectProduct ? 'Choose option for ' + selectProduct : 'Choose option');
    }

    var links = document.querySelectorAll('#mule-protection-modal a[href="#"]');
    for (var j = 0; j < links.length; j++) {
      // Empty placeholder link: drop href so it's no longer a focusable, nameless link
      if (!links[j].textContent.trim()) links[j].removeAttribute('href');
    }
  }

  function schedule() {
    if (scheduled) return;
    scheduled = true;
    setTimeout(fix, 50);
  }

  fix();
  new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true });
})();
