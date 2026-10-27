/* FAQ page: animated one-at-a-time accordion, and search that filters server-rendered items in place (hidden attribute only, nothing is removed). */
(function () {
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  function animateAnswer(details, opening) {
    var answer = details.querySelector('.help-faq-item__answer');
    if (details._helpFaqAnimation) details._helpFaqAnimation.cancel();
    details._helpFaqAnimation = null;
    answer.style.overflow = '';

    if (!opening && !details.open) return;
    details._helpFaqTarget = opening;
    if (opening) details.open = true;
    if (reduceMotion.matches || !answer.animate) {
      details.open = opening;
      return;
    }

    var height = answer.offsetHeight + 'px';
    var animation = answer.animate(
      opening
        ? [{ height: '0px', opacity: 0 }, { height: height, opacity: 1 }]
        : [{ height: height, opacity: 1 }, { height: '0px', opacity: 0 }],
      { duration: 300, easing: 'ease' }
    );
    answer.style.overflow = 'hidden';
    details._helpFaqAnimation = animation;
    animation.onfinish = function () {
      details._helpFaqAnimation = null;
      answer.style.overflow = '';
      if (!opening) details.open = false;
    };
  }

  function initAccordion(root) {
    var items = Array.prototype.slice.call(root.querySelectorAll('[data-help-faq-item]'));

    function openItem(details) {
      items.forEach(function (other) {
        if (other !== details) animateAnswer(other, false);
      });
      animateAnswer(details, true);
    }

    items.forEach(function (details) {
      // The name attribute gives one-at-a-time behaviour without JS; it is removed here so
      // the browser doesn't snap other items shut before their closing animation runs.
      details.removeAttribute('name');
      details._helpFaqOpen = openItem;
      details.querySelector('summary').addEventListener('click', function (event) {
        event.preventDefault();
        var isOpen = details._helpFaqAnimation ? details._helpFaqTarget : details.open;
        if (isOpen) {
          animateAnswer(details, false);
        } else {
          openItem(details);
        }
      });
    });
  }

  function init(root) {
    if (!root || root.hasAttribute('data-help-faq-ready')) return;

    initAccordion(root);

    var input = root.querySelector('[data-help-faq-input]');
    root.setAttribute('data-help-faq-ready', '');
    if (!input) return;

    var clearButton = root.querySelector('[data-help-faq-clear]');
    var empty = root.querySelector('[data-help-faq-empty]');
    var status = root.querySelector('[data-help-faq-status]');
    var tabs = Array.prototype.slice.call(root.querySelectorAll('[data-help-faq-tab]'));
    var entries = Array.prototype.map.call(root.querySelectorAll('[data-help-faq-item]'), function (item) {
      return {
        item: item,
        category: item.getAttribute('data-help-faq-category'),
        text: item.textContent.replace(/\s+/g, ' ').toLowerCase()
      };
    });
    var activeCategory = '';
    var statusTimer;

    function announce(message) {
      clearTimeout(statusTimer);
      statusTimer = setTimeout(function () {
        status.textContent = message;
      }, 400);
    }

    function filter() {
      var query = input.value.trim().toLowerCase();
      var shown = 0;

      entries.forEach(function (entry) {
        var match =
          (query === '' || entry.text.indexOf(query) !== -1) &&
          (activeCategory === '' || entry.category === activeCategory);
        entry.item.hidden = !match;
        if (match) shown++;
      });

      clearButton.hidden = input.value === '';
      empty.hidden = (query === '' && activeCategory === '') || shown > 0;

      if (query === '' && activeCategory === '') {
        announce('');
      } else if (shown === 0) {
        announce(empty.textContent.trim());
      } else if (shown === 1) {
        announce(root.dataset.resultOne);
      } else {
        announce(root.dataset.resultMany.replace('[count]', shown));
      }
    }

    function clear() {
      input.value = '';
      filter();
    }

    input.addEventListener('input', filter);
    input.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && input.value !== '') {
        event.preventDefault();
        clear();
      }
    });
    clearButton.addEventListener('click', function () {
      clear();
      input.focus();
    });

    // Category tabs: clicking a card shows only its questions; clicking the active card again shows all.
    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        var category = tab.getAttribute('data-help-faq-tab');
        activeCategory = activeCategory === category ? '' : category;
        tabs.forEach(function (other) {
          other.setAttribute('aria-pressed', String(activeCategory !== '' && other === tab));
        });
        filter();
      });
    });

    // Restored form state (back/forward cache) can leave a value in the field.
    if (input.value !== '') filter();
  }

  function initAll() {
    document.querySelectorAll('[data-help-faq]').forEach(init);
  }

  initAll();

  document.addEventListener('shopify:section:load', function (event) {
    init(event.target.querySelector('[data-help-faq]'));
  });

  document.addEventListener('shopify:block:select', function (event) {
    var details = event.target;
    if (details.matches && details.matches('details[data-help-faq-item]')) {
      if (details._helpFaqOpen) {
        details._helpFaqOpen(details);
      } else {
        details.open = true;
      }
    }
  });
})();
