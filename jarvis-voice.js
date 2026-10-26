"use strict";

(() => {
  const status = document.getElementById("voiceStatus");
  const buttons = [...document.querySelectorAll(".talk")];
  const visual = document.body;
  if (!status || !buttons.length) return;

  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognition = Recognition ? new Recognition() : null;
  let isListening = false;
  let conversationMode = false;
  let greeted = false;
  let gotResult = false;
  let awaitingReply = false;
  let stateTimer = 0;

  function setState(state, duration = 0) {
    window.clearTimeout(stateTimer);
    visual.dataset.jarvisState = state;
    if (duration) stateTimer = window.setTimeout(() => { visual.dataset.jarvisState = "idle"; }, duration);
  }

  function updateButtons() {
    buttons.forEach((button) => {
      button.setAttribute("aria-label", conversationMode ? "Stop voice conversation" : "Start voice conversation");
      button.setAttribute("aria-pressed", String(conversationMode));
    });
  }

  if (recognition) {
    recognition.lang = navigator.language || "en-US";
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.onstart = () => {
      isListening = true;
      gotResult = false;
      updateButtons();
      status.textContent = "Listening. Speak now.";
      setState("listening");
    };
    recognition.onresult = (event) => {
      const latest = event.results[event.resultIndex];
      if (!latest) return;
      const transcript = latest[0].transcript.trim();
      status.textContent = transcript || "Listening.";
      setState("listening");
      if (latest.isFinal && transcript) {
        gotResult = true;
        awaitingReply = true;
        isListening = false;
        updateButtons();
        setState("processing", 900);
        handleCommand(transcript);
      }
    };
    recognition.onerror = (event) => {
      isListening = false;
      conversationMode = false;
      awaitingReply = false;
      updateButtons();
      setState("idle");
      const messages = {
        "no-speech": "No speech detected. Tap the microphone and speak after it starts listening.",
        "audio-capture": "No microphone was found. Check the microphone selected in your browser.",
        "not-allowed": "Microphone access is blocked. Allow it for this site in your browser settings.",
        "service-not-allowed": "The browser speech service is unavailable for this site.",
        network: "The browser speech service could not connect. Check your connection and try once more.",
        aborted: "Voice input stopped.",
      };
      status.textContent = messages[event.error] || "Voice input stopped. Tap the microphone to try again.";
    };
    recognition.onend = () => {
      const wasListening = isListening;
      isListening = false;
      updateButtons();
      if (awaitingReply) return;
      if (wasListening && !gotResult) {
        conversationMode = false;
        updateButtons();
        status.textContent = "No speech detected. Tap the microphone and speak after it starts listening.";
        setState("idle");
      } else if (visual.dataset.jarvisState === "listening") {
        setState("idle");
      }
    };
  }

  function speak(message) {
    status.textContent = message;
    if (!("speechSynthesis" in window)) {
      setState("idle");
      awaitingReply = false;
      if (conversationMode) beginRecognition();
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(message);
    utterance.rate = 0.96;
    utterance.volume = 1;
    utterance.pitch = 0.92;
    utterance.onstart = () => setState("speaking");
    utterance.onend = () => {
      setState("idle");
      if (conversationMode) beginRecognition();
      else awaitingReply = false;
    };
    utterance.onerror = () => {
      setState("idle");
      if (conversationMode) beginRecognition();
      else awaitingReply = false;
    };
    window.speechSynthesis.speak(utterance);
  }

  function handleCommand(raw) {
    const message = raw.toLowerCase();
    status.textContent = raw;
    if (/\b(hello|hey|hi)\b/.test(message)) {
      speak("Hey, boss. What's new?");
    } else if (message.includes("time")) {
      speak(`The current time is ${new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}.`);
    } else if (message.includes("date")) {
      speak(`Today's date is ${new Date().toLocaleDateString([], { month: "long", day: "numeric", year: "numeric" })}.`);
    } else if (message.includes("open youtube")) {
      window.open("https://www.youtube.com/", "_blank", "noopener,noreferrer");
      speak("Opening YouTube in a new tab.");
    } else if (message.includes("open google")) {
      window.open("https://www.google.com/", "_blank", "noopener,noreferrer");
      speak("Opening Google in a new tab.");
    } else if (message.includes("open facebook")) {
      window.open("https://www.facebook.com/", "_blank", "noopener,noreferrer");
      speak("Opening Facebook in a new tab.");
    } else if (message.includes("wikipedia")) {
      const query = message.replace("wikipedia", "").trim();
      const url = query ? `https://en.wikipedia.org/w/index.php?search=${encodeURIComponent(query)}` : "https://www.wikipedia.org/";
      window.open(url, "_blank", "noopener,noreferrer");
      speak(query ? `Searching Wikipedia for ${query}.` : "Opening Wikipedia.");
    } else if (message.includes("what is") || message.includes("who is") || message.includes("what are")) {
      window.open(`https://www.google.com/search?q=${encodeURIComponent(raw)}`, "_blank", "noopener,noreferrer");
      speak(`Searching the web for ${raw}.`);
    } else {
      speak(`I heard: ${raw}. This demo can answer greetings, date and time, or open a web search.`);
    }
  }

  function beginRecognition() {
    if (!recognition || !conversationMode || isListening) return;
    awaitingReply = false;
    gotResult = false;
    try {
      recognition.start();
    } catch {
      status.textContent = "The microphone is starting. Wait for the listening pulse, then speak.";
    }
  }

  function startListening() {
    if (!recognition) {
      status.textContent = "Voice input is not supported in this browser. Try current Chrome or Edge.";
      return;
    }
    if (conversationMode) {
      conversationMode = false;
      awaitingReply = false;
      if (isListening) recognition.stop();
      window.speechSynthesis?.cancel();
      isListening = false;
      updateButtons();
      setState("idle");
      status.textContent = "Voice conversation stopped.";
      return;
    }
    conversationMode = true;
    updateButtons();
    status.textContent = "Starting microphone...";
    beginRecognition();
  }

  buttons.forEach((button) => button.addEventListener("click", startListening));

  window.JarvisVoice = {
    greetOnce() {
      if (greeted) return;
      greeted = true;
      speak("Hey, boss. What's new?");
    },
    onViewOpen() {},
    onViewClose() {
      if (!document.body.classList.contains("jarvis-docked")) {
        conversationMode = false;
        awaitingReply = false;
        if (isListening) recognition?.stop();
        window.speechSynthesis?.cancel();
        isListening = false;
        updateButtons();
        setState("idle");
      }
    },
  };
})();

