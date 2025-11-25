const MAX_GUESSES = 6;
let targetMovie;
let remainingGuesses;
let gameOver = false;
let allTitles = [];
let filteredTitles = [];
let activeSuggestionIndex = -1;

function normalizeTitle(title) {
  return title.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function pickRandomMovie() {
  const list = window.MOVIES || [];
  return list[Math.floor(Math.random() * list.length)];
}

function initTitles() {
  const csvTitles = window.EXTRA_TITLES || [];
  const movieTitles = (window.MOVIES || []).map((m) => m.title);
  const combined = [...movieTitles, ...csvTitles];
  const seen = new Set();
  allTitles = combined.filter((t) => {
    const key = t.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function updateGuessesRemaining() {
  document.getElementById("guesses-remaining").textContent = remainingGuesses;
}

function setFeedback(message, type = "neutral") {
  const el = document.getElementById("feedback");
  el.textContent = message;
  el.style.color =
    type === "success" ? "#16a34a" : type === "error" ? "#b91c1c" : "#64748b";
}

function renderAutocomplete() {
  const listEl = document.getElementById("autocomplete-list");
  if (!listEl) return;
  listEl.innerHTML = "";

  if (!filteredTitles.length) {
    listEl.style.display = "none";
    return;
  }

  filteredTitles.forEach((title, index) => {
    const li = document.createElement("li");
    li.textContent = title;
    li.className =
      "autocomplete-item" + (index === activeSuggestionIndex ? " active" : "");
    li.addEventListener("mousedown", (e) => {
      e.preventDefault();
      const input = document.getElementById("guess-input");
      input.value = title;
      filteredTitles = [];
      activeSuggestionIndex = -1;
      renderAutocomplete();
      input.focus();
    });
    listEl.appendChild(li);
  });

  listEl.style.display = "block";
}

function revealHints(step) {
  const hintMap = {
    1: "box_office",
    2: "genre",
    3: "year",
    4: "director",
    5: "main_actor",
  };

  const keys = Object.values(hintMap).slice(0, step);
  keys.forEach((key) => {
    const item = document.querySelector(`.hint-item[data-hint='${key}']`);
    if (!item) return;
    const span = item.querySelector("span");
    let value = "";

    if (key === "genre") value = targetMovie.genre.join(", ");
    else if (key === "year") value = targetMovie.year;
    else if (key === "main_actor") value = targetMovie.main_actor;
    else if (key === "director") value = targetMovie.director;
    else if (key === "box_office")
      value = `$${(targetMovie.box_office_usd / 1_000_000).toFixed(0)}M`;

    if (value) {
      span.textContent = value;
      item.classList.add("revealed");
    }
  });
}

function initPoster() {
  const el = document.getElementById("poster-blur");
  if (!el) return;
  if (targetMovie.poster_url) {
    el.style.backgroundImage = `url('${targetMovie.poster_url}')`;
    el.style.backgroundSize = "cover";
    el.style.backgroundPosition = "center";
    el.style.filter = "blur(16px) brightness(0.7)";
  }
}

function initGame() {
  targetMovie = pickRandomMovie();
  remainingGuesses = MAX_GUESSES;
  gameOver = false;

  updateGuessesRemaining();
  setFeedback("Start guessing the movie!");

  document.getElementById("guess-input").value = "";

  filteredTitles = [];
  activeSuggestionIndex = -1;
  renderAutocomplete();

  document.querySelectorAll(".hint-item").forEach((item) => {
    item.classList.remove("revealed");
    const span = item.querySelector("span");
    if (span) span.textContent = "";
  });

  initPoster();

  const playAgainBtn = document.getElementById("play-again");
  if (playAgainBtn) {
    playAgainBtn.disabled = true;
  }
}

function handleGuess(e) {
  e.preventDefault();
  if (gameOver) return;

  const input = document.getElementById("guess-input");
  const guess = input.value.trim();
  if (!guess) return;

  // collapse autocomplete when submitting
  filteredTitles = [];
  activeSuggestionIndex = -1;
  renderAutocomplete();

  const normalizedGuess = normalizeTitle(guess);
  const normalizedTarget = normalizeTitle(targetMovie.title);

  remainingGuesses--;
  updateGuessesRemaining();

   // progressively reduce blur as guesses are used
  const el = document.getElementById("poster-blur");
  if (el && targetMovie.poster_url) {
    const used = MAX_GUESSES - remainingGuesses;
    const clamped = Math.max(0, Math.min(used, MAX_GUESSES));
    const startBlur = 16; // px
    const endBlur = 0; // px (fully sharp)
    const blurAmount = startBlur - ((startBlur - endBlur) * clamped) / MAX_GUESSES;
    el.style.filter = `blur(${blurAmount}px) brightness(0.7)`;
  }

  if (normalizedGuess === normalizedTarget) {
    setFeedback(`Correct! It was "${targetMovie.title}".`, "success");
    gameOver = true;
    revealHints(5);
    const clearEl = document.getElementById("poster-blur");
    if (clearEl && targetMovie.poster_url) {
      clearEl.style.filter = "blur(0px) brightness(0.7)";
    }
    const playAgainBtn = document.getElementById("play-again");
    if (playAgainBtn) playAgainBtn.disabled = false;
    return;
  }

  const used = MAX_GUESSES - remainingGuesses;
  revealHints(Math.min(used, 5));

  if (remainingGuesses <= 0) {
    setFeedback(`Out of guesses! It was "${targetMovie.title}".`, "error");
    gameOver = true;
    const playAgainBtn = document.getElementById("play-again");
    if (playAgainBtn) playAgainBtn.disabled = false;
  } else {
    setFeedback("Not quite. Check your spelling and try again.", "error");
  }

  input.value = "";
}

function initDate() {
  const el = document.getElementById("current-date");
  if (!el) return;
  el.textContent = new Date().toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

document.addEventListener("DOMContentLoaded", () => {
  initDate();

  initTitles();

  const form = document.getElementById("guess-form");
  form.addEventListener("submit", handleGuess);

  const playAgainBtn = document.getElementById("play-again");
  if (playAgainBtn) {
    playAgainBtn.addEventListener("click", () => {
      initGame();
    });
  }

  const input = document.getElementById("guess-input");
  input.addEventListener("input", () => {
    const q = input.value.trim().toLowerCase();
    if (!q) {
      filteredTitles = [];
      activeSuggestionIndex = -1;
      renderAutocomplete();
      return;
    }

    filteredTitles = allTitles
      .filter((t) => t.toLowerCase().includes(q))
      .slice(0, 10);
    activeSuggestionIndex = -1;
    renderAutocomplete();
  });

  input.addEventListener("keydown", (e) => {
    if (!filteredTitles.length) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      activeSuggestionIndex =
        (activeSuggestionIndex + 1) % filteredTitles.length;
      renderAutocomplete();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      activeSuggestionIndex =
        (activeSuggestionIndex - 1 + filteredTitles.length) % filteredTitles.length;
      renderAutocomplete();
    } else if (e.key === "Enter") {
      if (activeSuggestionIndex >= 0) {
        e.preventDefault();
        input.value = filteredTitles[activeSuggestionIndex];
        filteredTitles = [];
        activeSuggestionIndex = -1;
        renderAutocomplete();
      }
    } else if (e.key === "Escape") {
      filteredTitles = [];
      activeSuggestionIndex = -1;
      renderAutocomplete();
    }
  });

  initGame();
});
