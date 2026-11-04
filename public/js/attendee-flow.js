/**
 * Concert Ticketing System - Attendee Client Flow
 * Implements Stitch UI Specifications & SRS Functional Requirements (FR-001 - FR-005)
 */

(function () {
  'use strict';

  // --- App State ---
  const state = {
    currentScreen: 'welcome',
    historyStack: [],
    events: [],
    selectedEvent: null,
    selectedTicketType: null,
    formData: {
      fullName: '',
      email: '',
      accountNumber: '',
      idFile: null
    },
    activeTicket: null,
    timerInterval: null
  };

  // --- DOM Elements ---
  const screens = {
    welcome: document.getElementById('screen-welcome'),
    register: document.getElementById('screen-register'),
    'ticket-select': document.getElementById('screen-ticket-select'),
    review: document.getElementById('screen-review'),
    'ticket-view': document.getElementById('screen-ticket-view')
  };

  const modals = {
    'missing-info': document.getElementById('modal-missing-info'),
    'duplicate-ticket': document.getElementById('modal-duplicate-ticket'),
    'purchase-blocked': document.getElementById('modal-purchase-blocked'),
    'sold-out': document.getElementById('modal-sold-out')
  };

  const navHeader = document.getElementById('app-nav-header');
  const navTitle = document.getElementById('nav-header-title');
  const navBackBtn = document.getElementById('nav-back-btn');

  // --- Navigation & Screen Routing ---
  function navigateTo(screenId, pushHistory = true) {
    if (pushHistory && state.currentScreen !== screenId) {
      state.historyStack.push(state.currentScreen);
    }

    state.currentScreen = screenId;

    Object.keys(screens).forEach(id => {
      if (screens[id]) {
        screens[id].classList.toggle('active', id === screenId);
      }
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Header visibility
    if (screenId === 'welcome') {
      navHeader.classList.add('hidden');
    } else {
      navHeader.classList.remove('hidden');
      if (screenId === 'register') navTitle.textContent = 'Account Registration';
      else if (screenId === 'ticket-select') navTitle.textContent = 'Select Tickets';
      else if (screenId === 'review') navTitle.textContent = 'Checkout Review';
      else if (screenId === 'ticket-view') navTitle.textContent = 'Order Confirmation';
    }
  }

  function goBack() {
    if (state.historyStack.length > 0) {
      const prevScreen = state.historyStack.pop();
      navigateTo(prevScreen, false);
    } else {
      navigateTo('welcome', false);
    }
  }

  // --- Modal Helpers ---
  function showModal(modalId, options = {}) {
    const modal = modals[modalId];
    if (!modal) return;

    if (modalId === 'missing-info' && options.message) {
      document.getElementById('missing-info-msg').textContent = options.message;
    } else if (modalId === 'purchase-blocked' && options.refId) {
      document.getElementById('blocked-ref-id').textContent = `Ref ID: ${options.refId}`;
    } else if (modalId === 'sold-out' && options.eventTitle) {
      document.getElementById('soldout-event-title').textContent = options.eventTitle;
    } else if (modalId === 'duplicate-ticket' && options.ticketCode) {
      const viewBtn = document.getElementById('modal-duplicate-view-btn');
      viewBtn.onclick = () => {
        hideModal('duplicate-ticket');
        loadAndDisplayTicket(options.ticketCode);
      };
    }

    modal.classList.remove('hidden');
  }

  function hideModal(modalId) {
    const modal = modals[modalId];
    if (modal) {
      modal.classList.add('hidden');
    }
  }

  // --- API Integrations ---
  async function fetchEvents() {
    try {
      const res = await fetch('/api/events');
      const data = await res.json();
      if (data.success && data.events.length > 0) {
        state.events = data.events;
        populateEventDropdown();
        loadEventDetails(data.events[0].slug);
      }
    } catch (err) {
      console.error('Failed to fetch events:', err);
    }
  }

  async function loadEventDetails(slug) {
    try {
      const res = await fetch(`/api/events/${slug}`);
      const data = await res.json();
      if (data.success) {
        state.selectedEvent = data.event;
        updateEventCards(data.event);
        populateTicketTypes(data.ticketTypes);
      }
    } catch (err) {
      console.error('Failed to load event details:', err);
    }
  }

  function updateEventCards(event) {
    // Welcome screen featured
    const wTitle = document.getElementById('welcome-event-title');
    if (wTitle) wTitle.textContent = event.title;

    // Reg screen
    const regTitle = document.getElementById('reg-event-title');
    const regMeta = document.getElementById('reg-event-meta');
    if (regTitle) regTitle.textContent = event.title;
    if (regMeta) regMeta.textContent = `${event.date_time_str} • ${event.venue}`;

    // Tier banner
    const tierTitle = document.getElementById('tier-banner-title');
    const tierVenue = document.getElementById('tier-banner-venue');
    const tierDate = document.getElementById('tier-date-display');
    if (tierTitle) tierTitle.textContent = event.title;
    if (tierVenue) tierVenue.textContent = `${event.venue} • ${event.hall || 'Main Stage'}`;
    if (tierDate) tierDate.textContent = event.date_time_str;
  }

  function populateEventDropdown() {
    const dropdown = document.getElementById('event-select-dropdown');
    if (!dropdown) return;

    dropdown.innerHTML = state.events.map(ev => `
      <option value="${ev.slug}" ${ev.status === 'SoldOut' ? 'data-sold="true"' : ''}>
        ${ev.title} ${ev.status === 'SoldOut' ? '(Sold Out)' : ''}
      </option>
    `).join('');

    dropdown.addEventListener('change', (e) => {
      const selectedSlug = e.target.value;
      loadEventDetails(selectedSlug);
    });
  }

  function populateTicketTypes(types) {
    const dropdown = document.getElementById('ticket-type-dropdown');
    if (!dropdown) return;

    dropdown.innerHTML = types.map((t, idx) => `
      <option value="${t.id}" data-index="${idx}" ${idx === 0 ? 'selected' : ''}>
        ${t.name} ($${parseFloat(t.price).toFixed(2)})
      </option>
    `).join('');

    state.ticketTypes = types;
    if (types.length > 0) {
      selectTicketType(types[0]);
    }

    dropdown.addEventListener('change', (e) => {
      const selectedId = parseInt(e.target.value, 10);
      const chosen = state.ticketTypes.find(t => t.id === selectedId);
      if (chosen) selectTicketType(chosen);
    });
  }

  function selectTicketType(ticketType) {
    state.selectedTicketType = ticketType;
    const priceFormatted = `$${parseFloat(ticketType.price).toFixed(2)}`;

    // Subtotal pill
    const subtotalEl = document.getElementById('tier-subtotal-price');
    if (subtotalEl) subtotalEl.textContent = priceFormatted;

    // Chips inclusions
    const chipsContainer = document.getElementById('inclusions-chips-container');
    if (chipsContainer && Array.isArray(ticketType.inclusions)) {
      chipsContainer.innerHTML = ticketType.inclusions.map(inc => `
        <div class="inline-flex items-center gap-1.5 bg-surface-container px-3 py-1.5 rounded-full transition-all">
          <span class="material-symbols-outlined text-primary text-[18px]">${inc.icon || 'check_circle'}</span>
          <span class="text-[13px] text-on-surface font-semibold">${inc.text}</span>
        </div>
      `).join('');
    }
  }

  // --- Step 1: Attendee Info Validation ---
  function validateStep1() {
    const nameInput = document.getElementById('reg-fullname');
    const emailInput = document.getElementById('reg-email');
    const accountInput = document.getElementById('reg-account');

    const name = nameInput.value.trim();
    const email = emailInput.value.trim();
    const account = accountInput.value.trim();

    if (!name || !email || !account) {
      showModal('missing-info', { message: 'Please complete all required attendee fields.' });
      return false;
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      showModal('missing-info', { message: 'Please enter a valid email address.' });
      return false;
    }

    state.formData.fullName = name;
    state.formData.email = email;
    state.formData.accountNumber = account;

    return true;
  }

  // --- Step 3: Populate Review Screen ---
  function populateReviewScreen() {
    document.getElementById('review-name').textContent = state.formData.fullName;
    document.getElementById('review-email').textContent = state.formData.email;
    document.getElementById('review-account').textContent = state.formData.accountNumber;

    if (state.selectedEvent) {
      document.getElementById('review-event-title').textContent = state.selectedEvent.title;
      document.getElementById('review-event-display').textContent = state.selectedEvent.title;
      document.getElementById('review-event-meta').innerHTML = `
        <span class="material-symbols-outlined text-[16px]">calendar_today</span>
        ${state.selectedEvent.date_time_str}
      `;
    }

    if (state.selectedTicketType) {
      const priceFormatted = `$${parseFloat(state.selectedTicketType.price).toFixed(2)}`;
      document.getElementById('review-tier-display').textContent = `${state.selectedTicketType.name} (${priceFormatted})`;
      document.getElementById('review-breakdown-subtotal').textContent = priceFormatted;
      document.getElementById('review-breakdown-total').textContent = priceFormatted;
    }
  }

  // --- Step 4: Submit Purchase to Backend ---
  async function submitPurchase() {
    const confirmBtn = document.getElementById('review-confirm-btn');
    confirmBtn.disabled = true;
    confirmBtn.innerHTML = `
      <span class="material-symbols-outlined animate-spin text-[20px]">progress_activity</span>
      <span>Processing...</span>
    `;

    try {
      const formData = new FormData();
      formData.append('fullName', state.formData.fullName);
      formData.append('email', state.formData.email);
      formData.append('accountNumber', state.formData.accountNumber);
      formData.append('eventId', state.selectedEvent ? state.selectedEvent.id : 1);
      formData.append('ticketTypeId', state.selectedTicketType ? state.selectedTicketType.id : 1);

      if (state.formData.idFile) {
        formData.append('idDocument', state.formData.idFile);
      }

      const res = await fetch('/api/tickets/purchase', {
        method: 'POST',
        body: formData
      });

      const result = await res.json();

      if (res.status === 201 && result.success) {
        confirmBtn.innerHTML = `
          <span class="material-symbols-outlined text-[20px]">check_circle</span>
          <span>Confirmed!</span>
        `;
        confirmBtn.classList.remove('bg-primary-container');
        confirmBtn.classList.add('bg-emerald-600');

        setTimeout(() => {
          renderDigitalTicket(result.ticket);
          navigateTo('ticket-view');
        }, 600);
      } else if (res.status === 409) {
        // FR-002: Duplicate ticket detected
        showModal('duplicate-ticket', { ticketCode: result.ticketCode });
      } else if (res.status === 410) {
        // FR-003: Sold out
        showModal('sold-out', { eventTitle: state.selectedEvent ? state.selectedEvent.title : 'Selected Event' });
      } else if (res.status === 429) {
        // FR-004: Bot detected / rate limited
        showModal('purchase-blocked', { refId: result.refId });
      } else if (res.status === 400) {
        // Missing Info
        showModal('missing-info', { message: result.message || 'Please complete all required fields.' });
      } else {
        alert(result.message || 'An error occurred during ticketing.');
      }
    } catch (err) {
      console.error('Purchase error:', err);
      alert('Network error connecting to ticketing service.');
    } finally {
      setTimeout(() => {
        confirmBtn.disabled = false;
        confirmBtn.innerHTML = `
          <span>Confirm</span>
          <span class="material-symbols-outlined text-[20px]">arrow_forward</span>
        `;
        confirmBtn.classList.remove('bg-emerald-600');
        confirmBtn.classList.add('bg-primary-container');
      }, 1000);
    }
  }

  // --- Display Digital Ticket Pass (FR-005) ---
  function renderDigitalTicket(ticket) {
    state.activeTicket = ticket;

    document.getElementById('ticket-card-title').textContent = ticket.eventTitle || ticket.event_title;
    document.getElementById('ticket-card-attendee').textContent = ticket.attendeeName || ticket.full_name;
    document.getElementById('ticket-card-date').textContent = ticket.dateTimeStr || ticket.date_time_str;
    document.getElementById('ticket-card-seat').textContent = ticket.seatInfo || ticket.seat_info;
    document.getElementById('ticket-card-code').textContent = ticket.ticketCode || ticket.ticket_code;

    const statusText = ticket.status || 'Valid';
    const statusTextEl = document.getElementById('ticket-card-status-text');
    const statusBadgeEl = document.getElementById('ticket-card-status-badge');
    const issuedPill = document.getElementById('ticket-issued-pill-text');

    if (statusText === 'Revoked') {
      statusTextEl.textContent = 'Revoked';
      statusBadgeEl.className = 'inline-flex items-center gap-1.5 bg-rose-100 text-rose-800 px-3 py-1 rounded-full font-bold text-[13px] mt-0.5';
      issuedPill.textContent = 'Pass Revoked';
      issuedPill.parentElement.className = 'bg-rose-100 text-rose-900 font-bold text-[14px] px-4 py-2 rounded-full inline-flex items-center gap-2 shadow-sm';
    } else {
      statusTextEl.textContent = 'Valid';
      statusBadgeEl.className = 'inline-flex items-center gap-1.5 bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full font-bold text-[13px] mt-0.5';
      issuedPill.textContent = 'Ticket Issued';
      issuedPill.parentElement.className = 'bg-emerald-100 text-emerald-900 font-bold text-[14px] px-4 py-2 rounded-full inline-flex items-center gap-2 shadow-sm';
    }

    startBarcodeTimer();
  }

  async function loadAndDisplayTicket(ticketCode) {
    try {
      const res = await fetch(`/api/tickets/${ticketCode}`);
      const data = await res.json();
      if (data.success && data.ticket) {
        renderDigitalTicket(data.ticket);
        navigateTo('ticket-view');
      } else {
        alert('Ticket not found.');
      }
    } catch (err) {
      console.error('Error fetching ticket:', err);
    }
  }

  // --- Dynamic Barcode Timer (15:00 countdown) ---
  function startBarcodeTimer() {
    if (state.timerInterval) clearInterval(state.timerInterval);
    let secondsLeft = 900;
    const timerEl = document.getElementById('live-ticket-timer');

    function update() {
      const mins = Math.floor(secondsLeft / 60);
      const secs = secondsLeft % 60;
      if (timerEl) {
        timerEl.textContent = `${mins}:${secs < 10 ? '0' : ''}${secs}`;
      }
      if (secondsLeft <= 0) {
        secondsLeft = 900; // auto-refresh
      } else {
        secondsLeft--;
      }
    }

    update();
    state.timerInterval = setInterval(update, 1000);
  }

  // --- Event Listeners Setup ---
  function setupEventListeners() {
    // Nav back button
    navBackBtn.addEventListener('click', goBack);

    // Welcome screen "Get Ticket" CTA
    document.getElementById('welcome-get-ticket-cta').addEventListener('click', () => {
      navigateTo('register');
    });

    // Welcome screen Quick Lookup
    document.getElementById('welcome-lookup-btn').addEventListener('click', async () => {
      const accountInput = document.getElementById('welcome-lookup-input');
      const account = accountInput.value.trim();
      if (!account) {
        showModal('missing-info', { message: 'Please enter your Account Number to look up tickets.' });
        return;
      }

      try {
        const res = await fetch('/api/attendee/lookup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accountNumber: account })
        });
        const data = await res.json();
        if (data.success && data.ticket) {
          renderDigitalTicket(data.ticket);
          navigateTo('ticket-view');
        } else {
          showModal('missing-info', { message: data.message || 'No active ticket found for this Account Number.' });
        }
      } catch (err) {
        alert('Lookup failed. Check server connection.');
      }
    });

    // File Upload handling
    const dropzone = document.getElementById('id-dropzone');
    const fileInput = document.getElementById('id-file-input');
    const defaultView = document.getElementById('upload-default-view');
    const activeView = document.getElementById('upload-active-view');
    const filenameEl = document.getElementById('uploaded-filename');
    const removeBtn = document.getElementById('remove-file-btn');

    dropzone.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        state.formData.idFile = file;
        filenameEl.textContent = file.name;
        defaultView.classList.add('hidden');
        activeView.classList.remove('hidden');
        activeView.classList.add('flex');
      }
    });

    removeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      fileInput.value = '';
      state.formData.idFile = null;
      activeView.classList.add('hidden');
      activeView.classList.remove('flex');
      defaultView.classList.remove('hidden');
    });

    // Step 1 "Next" button
    document.getElementById('reg-next-btn').addEventListener('click', () => {
      if (validateStep1()) {
        navigateTo('ticket-select');
      }
    });

    // Step 2 "Next" button
    document.getElementById('tier-next-btn').addEventListener('click', () => {
      if (!state.selectedTicketType) {
        showModal('missing-info', { message: 'Please select a ticket tier.' });
        return;
      }
      populateReviewScreen();
      navigateTo('review');
    });

    // Step 3 Inline Edit buttons
    document.getElementById('edit-name-btn').addEventListener('click', () => navigateTo('register'));
    document.getElementById('edit-email-btn').addEventListener('click', () => navigateTo('register'));
    document.getElementById('edit-account-btn').addEventListener('click', () => navigateTo('register'));
    document.getElementById('edit-event-btn').addEventListener('click', () => navigateTo('ticket-select'));
    document.getElementById('edit-tier-btn').addEventListener('click', () => navigateTo('ticket-select'));

    // Step 3 "Confirm" button
    document.getElementById('review-confirm-btn').addEventListener('click', submitPurchase);

    // Step 4 Wallet button
    const walletBtn = document.getElementById('ticket-wallet-btn');
    walletBtn.addEventListener('click', () => {
      const prevContent = walletBtn.innerHTML;
      walletBtn.innerHTML = `
        <span class="material-symbols-outlined text-[20px] text-emerald-400">check</span>
        <span>Pass Saved to Apple Wallet</span>
      `;
      walletBtn.classList.replace('bg-inverse-surface', 'bg-emerald-700');
      setTimeout(() => {
        walletBtn.innerHTML = prevContent;
        walletBtn.classList.replace('bg-emerald-700', 'bg-inverse-surface');
      }, 2500);
    });

    // Step 4 "Back to Home" button
    document.getElementById('ticket-back-home-btn').addEventListener('click', () => {
      state.historyStack = [];
      navigateTo('welcome', false);
    });

    // Modal dismiss handlers
    document.getElementById('modal-missing-ok-btn').addEventListener('click', () => hideModal('missing-info'));
    document.getElementById('modal-duplicate-dismiss-btn').addEventListener('click', () => hideModal('duplicate-ticket'));
    document.getElementById('modal-blocked-ok-btn').addEventListener('click', () => hideModal('purchase-blocked'));
    document.getElementById('modal-soldout-ok-btn').addEventListener('click', () => hideModal('sold-out'));

    const waitlistBtn = document.getElementById('modal-soldout-waitlist-btn');
    waitlistBtn.addEventListener('click', () => {
      waitlistBtn.textContent = 'Added to Waitlist ✓';
      waitlistBtn.className = 'mt-2 text-emerald-700 font-bold text-[13px] py-1.5 px-3 rounded-full bg-emerald-100';
      setTimeout(() => hideModal('sold-out'), 800);
    });
  }

  // --- Initializer ---
  document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    fetchEvents();
  });
})();
