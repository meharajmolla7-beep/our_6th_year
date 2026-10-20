(() => {
  "use strict";
  const start = new Date(2020, 9, 21, 0, 0, 0); // Local date: 21 October 2020
  const $ = (s, root=document) => root.querySelector(s);
  const $$ = (s, root=document) => [...root.querySelectorAll(s)];

  function updateCounter() {
    const now = new Date();
    let years = now.getFullYear() - start.getFullYear();
    const anniversary = new Date(now.getFullYear(), start.getMonth(), start.getDate());
    if (now < anniversary) years--;
    const lastAnniversary = new Date(start.getFullYear() + years, start.getMonth(), start.getDate());
    const nextAnniversary = new Date(start.getFullYear() + years + 1, start.getMonth(), start.getDate());
    const elapsed = Math.max(0, now - lastAnniversary);
    const days = Math.floor(elapsed / 86400000);
    const hours = Math.floor((elapsed % 86400000) / 3600000);
    const minutes = Math.floor((elapsed % 3600000) / 60000);
    const seconds = Math.floor((elapsed % 60000) / 1000);
    $("#years").textContent = String(Math.max(0, years)).padStart(2, "0");
    $("#days").textContent = String(days).padStart(3, "0");
    $("#hours").textContent = String(hours).padStart(2, "0");
    $("#minutes").textContent = String(minutes).padStart(2, "0");
    $("#seconds").textContent = String(seconds).padStart(2, "0");
  }
  updateCounter(); setInterval(updateCounter, 1000);

  // Soft, original ambient melody generated locally in the browser. No external song file required.
  let audioCtx = null, master = null, musicTimer = null, noteIndex = 0, musicOn = false;
  const melody = [261.63, 329.63, 392.00, 329.63, 293.66, 349.23, 440.00, 349.23, 261.63, 329.63, 392.00, 523.25, 440.00, 392.00, 349.23, 293.66];
  function playNote(freq, when, duration, volume=0.045, type="sine") {
    if (!audioCtx || !master) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    const low = audioCtx.createBiquadFilter();
    low.type = "lowpass"; low.frequency.value = 1600;
    osc.type = type; osc.frequency.setValueAtTime(freq, when);
    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.exponentialRampToValueAtTime(volume, when + 0.09);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + duration);
    osc.connect(low); low.connect(gain); gain.connect(master);
    osc.start(when); osc.stop(when + duration + 0.04);
  }
  function scheduleMusic() {
    if (!musicOn || !audioCtx) return;
    const now = audioCtx.currentTime + 0.04;
    const freq = melody[noteIndex % melody.length];
    playNote(freq, now, 1.35, 0.035, "sine");
    if (noteIndex % 4 === 0) playNote(freq / 2, now, 1.8, 0.018, "triangle");
    noteIndex++;
  }
  async function toggleMusic() {
    const btn = $("#musicToggle");
    if (!musicOn) {
      try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) { toast("This browser doesn't support the built-in melody."); return; }
        if (!audioCtx) {
          audioCtx = new AudioContext();
          master = audioCtx.createGain();
          master.gain.value = 0.65;
          master.connect(audioCtx.destination);
        }
        if (audioCtx.state === "suspended") await audioCtx.resume();
        musicOn = true; scheduleMusic(); musicTimer = setInterval(scheduleMusic, 720);
        btn.setAttribute("aria-pressed", "true"); $("#musicLabel").textContent = "Pause our melody";
      } catch (err) { toast("Please tap play again to enable the melody."); }
    } else {
      musicOn = false; clearInterval(musicTimer); musicTimer = null;
      if (master && audioCtx) master.gain.setTargetAtTime(0.0001, audioCtx.currentTime, 0.12);
      btn.setAttribute("aria-pressed", "false"); $("#musicLabel").textContent = "Play our melody";
      setTimeout(() => { if (!musicOn && master && audioCtx) master.gain.setTargetAtTime(0.65, audioCtx.currentTime, 0.01); }, 220);
    }
  }
  $("#musicToggle").addEventListener("click", toggleMusic);

  // Scroll reveal effects
  const revealEls = $$(".reveal");
  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add("visible"); observer.unobserve(entry.target); }
    }), { threshold: 0.12 });
    revealEls.forEach(el => observer.observe(el));
  } else revealEls.forEach(el => el.classList.add("visible"));

  // Reasons reveal
  $$(".reason").forEach(card => card.addEventListener("click", () => {
    const wasOpen = card.classList.contains("open");
    card.classList.toggle("open", !wasOpen);
    card.setAttribute("aria-expanded", String(!wasOpen));
  }));

  function toast(message) {
    const el = $("#toast"); el.textContent = message; el.classList.add("show");
    clearTimeout(toast.timer); toast.timer = setTimeout(() => el.classList.remove("show"), 2800);
  }
  function openModal(id) {
    const el = document.getElementById(id); el.hidden = false; document.body.classList.add("modal-open");
    const close = el.querySelector(".modal-close"); if (close) close.focus();
  }
  function closeModal(id) {
    const el = document.getElementById(id); if (el) el.hidden = true;
    if ($("#secretModal").hidden && $("#photoLightbox").hidden) document.body.classList.remove("modal-open");
  }
  $("#openSecret").addEventListener("click", () => openModal("secretModal"));
  $$("[data-close]").forEach(el => el.addEventListener("click", () => closeModal(el.dataset.close)));
  document.addEventListener("keydown", e => {
    if (e.key === "Escape") { closeModal("secretModal"); closeLightbox(); }
  });

  // Photo frames gracefully use placeholders until the user's own files are added.
  $$(".memory-card").forEach(card => {
    const path = card.dataset.photo;
    const img = new Image();
    img.src = path;
    img.alt = card.dataset.caption || "A memory of Meharaj and Zinat";
    img.addEventListener("load", () => {
      card.querySelector(".photo-placeholder")?.remove();
      card.prepend(img);
    });
    img.addEventListener("error", () => {});
    card.addEventListener("click", () => {
      const existing = card.querySelector("img");
      if (!existing) { toast("Add your picture as " + path + " inside the photos folder."); return; }
      $("#lightboxImage").src = existing.src;
      $("#lightboxCaption").textContent = card.dataset.caption || "";
      $("#photoLightbox").hidden = false; document.body.classList.add("modal-open");
    });
  });
  function closeLightbox() {
    $("#photoLightbox").hidden = true;
    if ($("#secretModal").hidden) document.body.classList.remove("modal-open");
  }
  $("#closeLightbox").addEventListener("click", closeLightbox);
  $("#photoLightbox").addEventListener("click", e => { if (e.target.id === "photoLightbox") closeLightbox(); });

  $("#openLetter").addEventListener("click", () => {
    const envelope = $("#letterEnvelope");
    const isOpen = envelope.classList.toggle("open");
    $("#openLetter").textContent = isOpen ? "Close my letter ♡" : "Open my letter ♡";
    if (isOpen) envelope.scrollIntoView({ behavior: "smooth", block: "center" });
  });
})();
