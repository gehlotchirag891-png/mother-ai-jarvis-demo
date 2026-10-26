"use strict";

(() => {
  const button = document.querySelector(".talk");
  const status = document.querySelector(".content");
  if (!button || !status) return;

  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognition = Recognition ? new Recognition() : null;
  let isListening = false;

  if (recognition) {
    recognition.lang = navigator.language || "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onstart = () => { isListening = true; button.setAttribute("aria-label", "Stop voice input"); status.textContent = "Listening..."; };
    recognition.onresult = (event) => handleCommand(event.results[0][0].transcript.trim());
    recognition.onerror = (event) => {
      status.textContent = event.error === "not-allowed" || event.error === "service-not-allowed"
        ? "Microphone permission was not granted."
        : "I couldn't hear that. Click the microphone to try again.";
    };
    recognition.onend = () => { isListening = false; button.setAttribute("aria-label", "Start voice input"); };
  }

  function speak(message) {
    status.textContent = message;
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(message);
    utterance.rate = 1;
    utterance.volume = 1;
    utterance.pitch = 1;
    window.speechSynthesis.speak(utterance);
  }

  function handleCommand(raw) {
    const message = raw.toLowerCase();
    status.textContent = raw || "I didn't catch that. Click the microphone to try again.";
    if (!message) return;
    if (/\b(hello|hey|hi)\b/.test(message)) {
      speak("Hello. How may I help you?");
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
      const url = query
        ? `https://en.wikipedia.org/w/index.php?search=${encodeURIComponent(query)}`
        : "https://www.wikipedia.org/";
      window.open(url, "_blank", "noopener,noreferrer");
      speak(query ? `Searching Wikipedia for ${query}.` : "Opening Wikipedia.");
    } else if (message.includes("what is") || message.includes("who is") || message.includes("what are")) {
      window.open(`https://www.google.com/search?q=${encodeURIComponent(raw)}`, "_blank", "noopener,noreferrer");
      speak(`Searching the web for ${raw}.`);
    } else {
      speak(`I heard: ${raw}. This demo can answer simple greetings, time, and date, or open a web search.`);
    }
  }

  button.addEventListener("click", () => {
    if (!recognition) {
      status.textContent = "Voice input isn't supported in this browser. Try a current version of Chrome or Edge.";
      return;
    }
    if (isListening) recognition.stop();
    else {
      try { recognition.start(); }
      catch { status.textContent = "Voice input is already starting. Please wait a moment."; }
    }
  });

  window.JarvisVoice = {
    onViewOpen() {},
    onViewClose() {
      if (isListening) recognition?.stop();
      window.speechSynthesis?.cancel();
    },
  };
})();
