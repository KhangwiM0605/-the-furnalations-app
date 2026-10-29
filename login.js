const authForm = document.getElementById("authForm");
const authFeedback = document.getElementById("authFeedback");
const passwordInput = document.getElementById("password");
const confirmPasswordInput = document.getElementById("confirmPassword");
const confirmField = document.getElementById("confirmField");
const signupNameField = document.getElementById("signupNameField");
const displayNameInput = document.getElementById("displayName");
const passwordToggle = document.getElementById("passwordToggle");
const forgotPassword = document.getElementById("forgotPassword");
const sessionNote = document.getElementById("sessionNote");
const loginTitle = document.getElementById("loginTitle");
const loginIntro = document.getElementById("loginIntro");
const authTabs = document.querySelector(".auth-tabs");
const signedInPanel = document.getElementById("signedInPanel");
const signedInMessage = document.getElementById("signedInMessage");
const signOutButton = document.getElementById("signOutButton");
const verificationPanel = document.getElementById("verificationPanel");
const verificationMessage = document.getElementById("verificationMessage");
const verificationEmail = document.getElementById("verificationEmail");
const resendVerification = document.getElementById("resendVerification");
const returnToSignIn = document.getElementById("returnToSignIn");
const apiBaseUrl = (window.FURNALATIONS_API_BASE_URL
  || (/^(localhost|127\.0\.0\.1)$/.test(location.hostname) ? "http://localhost:3000" : ""))
  .replace(/\/+$/, "");
const sessionStorageKey = "furnalations-account-session";
let authMode = "signin";

function showFeedback(message, kind = "") {
  authFeedback.textContent = message;
  authFeedback.dataset.kind = kind;
}

function setAuthMode(mode) {
  authMode = mode;
  const isSignUp = mode === "signup";
  authForm.hidden = false;
  authTabs.hidden = false;
  verificationPanel.hidden = true;
  document.querySelectorAll(".auth-tab").forEach(tab => {
    const active = tab.dataset.mode === mode;
    tab.classList.toggle("active", active);
    tab.setAttribute("aria-selected", String(active));
  });
  loginTitle.textContent = isSignUp ? "Start your journey." : "Welcome back.";
  loginIntro.textContent = isSignUp ? "Create a place to keep showing up." : "Sign in to return to your journey.";
  document.getElementById("authSubmit").firstChild.textContent = isSignUp ? "Create account " : "Sign in ";
  document.getElementById("email").autocomplete = "email";
  passwordInput.autocomplete = isSignUp ? "new-password" : "current-password";
  confirmField.hidden = !isSignUp;
  confirmPasswordInput.required = isSignUp;
  signupNameField.hidden = !isSignUp;
  displayNameInput.required = isSignUp;
  forgotPassword.hidden = isSignUp;
  sessionNote.hidden = isSignUp;
  showFeedback("");
  confirmPasswordInput.value = "";
  passwordInput.value = "";
  displayNameInput.value = "";
  passwordInput.type = "password";
  passwordToggle.textContent = "SHOW";
  passwordToggle.setAttribute("aria-label", "Show password");
  passwordToggle.setAttribute("aria-pressed", "false");
}

function showSignedIn(user) {
  authForm.hidden = true;
  authTabs.hidden = true;
  verificationPanel.hidden = true;
  signedInPanel.hidden = false;
  loginTitle.textContent = "Welcome, " + user.displayName + ".";
  loginIntro.textContent = "Your account is ready.";
  signedInMessage.textContent = "Signed in as " + user.email + ".";
  showFeedback("");
}

function showVerificationPanel(email, message, verified = false) {
  authForm.hidden = true;
  authTabs.hidden = true;
  signedInPanel.hidden = true;
  passwordInput.value = "";
  confirmPasswordInput.value = "";
  verificationPanel.hidden = false;
  verificationEmail.value = email || "";
  verificationEmail.disabled = verified;
  resendVerification.hidden = verified;
  returnToSignIn.textContent = verified ? "Continue to sign in" : "Return to sign in";
  loginTitle.textContent = verified ? "Email verified." : "Check your inbox.";
  loginIntro.textContent = verified ? "Your account is ready." : "One quick step before you can sign in.";
  verificationMessage.textContent = message;
  showFeedback("");
}

function clearSession() {
  try {
    sessionStorage.removeItem(sessionStorageKey);
  } catch (error) {
    console.error("Could not clear the sign-in session:", error);
    showFeedback("This browser could not clear the local sign-in session. Check browser storage settings.", "error");
  }
}

async function requestApi(path, options = {}) {
  if (!apiBaseUrl) {
    throw new Error("The account API is not configured for this website yet.");
  }
  let response;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);
  try {
    response = await fetch(apiBaseUrl + path, {
      ...options,
      headers: { "Content-Type": "application/json", ...options.headers },
      signal: controller.signal
    });
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error("The account server took too long to respond. Please try again.");
    }
    throw new Error("Could not reach the account server. Please try again later.");
  } finally {
    clearTimeout(timeout);
  }
  const result = await response.json().catch(() => null);
  if (!response.ok) {
    const fieldErrors = Array.isArray(result?.fields)
      ? result.fields.map(field => `${field.field}: ${field.message}`).join(" ")
      : "";
    const error = new Error([result?.error || "The account server could not complete that request.", fieldErrors].filter(Boolean).join(" "));
    error.code = result?.code;
    throw error;
  }
  if (!result) {
    throw new Error("The account server returned an invalid response.");
  }
  return result;
}

function storeSession(result) {
  try {
    sessionStorage.setItem(sessionStorageKey, JSON.stringify({
      accessToken: result.accessToken,
      expiresAt: Date.now() + result.expiresIn * 1000,
      user: result.user
    }));
    return true;
  } catch (error) {
    console.error("Could not save the sign-in session:", error);
    return false;
  }
}

document.querySelectorAll(".auth-tab").forEach(tab => {
  tab.addEventListener("click", () => setAuthMode(tab.dataset.mode));
});

passwordToggle.addEventListener("click", () => {
  const showPassword = passwordInput.type === "password";
  passwordInput.type = showPassword ? "text" : "password";
  passwordToggle.textContent = showPassword ? "HIDE" : "SHOW";
  passwordToggle.setAttribute("aria-label", showPassword ? "Hide password" : "Show password");
  passwordToggle.setAttribute("aria-pressed", String(showPassword));
});

forgotPassword.addEventListener("click", () => {
  showFeedback("Password recovery is not available yet. Contact the site owner for help.");
});

authForm.addEventListener("submit", async event => {
  event.preventDefault();
  showFeedback("");
  if (!authForm.reportValidity()) return;

  if (authMode === "signup" && passwordInput.value !== confirmPasswordInput.value) {
    confirmPasswordInput.setCustomValidity("Passwords do not match.");
    confirmPasswordInput.reportValidity();
    confirmPasswordInput.addEventListener("input", () => confirmPasswordInput.setCustomValidity(""), { once: true });
    return;
  }

  const submitButton = document.getElementById("authSubmit");
  submitButton.disabled = true;
  const request = {
    email: document.getElementById("email").value.trim(),
    password: passwordInput.value
  };
  if (authMode === "signup") request.displayName = displayNameInput.value.trim();

  try {
    const result = await requestApi(authMode === "signup" ? "/api/auth/signup" : "/api/auth/login", {
      method: "POST",
      body: JSON.stringify(request)
    });
    if (result.verificationRequired) {
      showVerificationPanel(request.email, "Your account was created. Open the verification link we sent to your email address before signing in.");
      return;
    }
    if (!result.accessToken || !result.user || !result.expiresIn) {
      throw new Error("The account server returned an incomplete sign-in session.");
    }
    if (!storeSession(result)) {
      showFeedback("Your account is ready, but this browser could not save your sign-in session. Check browser storage settings.", "error");
      return;
    }
    authForm.reset();
    setAuthMode("signin");
    showSignedIn(result.user);
  } catch (error) {
    if (error.code === "EMAIL_NOT_VERIFIED" || error.code === "VERIFICATION_EMAIL_FAILED") {
      showVerificationPanel(request.email, error.message);
      return;
    }
    showFeedback(error.message || "Sign-in failed. Please try again.", "error");
  } finally {
    submitButton.disabled = false;
  }
});

resendVerification.addEventListener("click", async () => {
  showFeedback("");
  if (!verificationEmail.reportValidity()) return;

  resendVerification.disabled = true;
  try {
    const result = await requestApi("/api/auth/resend-verification", {
      method: "POST",
      body: JSON.stringify({ email: verificationEmail.value.trim() })
    });
    verificationMessage.textContent = result.message;
    showFeedback("");
  } catch (error) {
    showFeedback(error.message || "Could not request a verification email. Please try again.", "error");
  } finally {
    resendVerification.disabled = false;
  }
});

returnToSignIn.addEventListener("click", () => {
  const email = verificationEmail.value;
  setAuthMode("signin");
  document.getElementById("email").value = email;
  loginTitle.textContent = "Welcome back.";
  loginIntro.textContent = "Sign in to return to your journey.";
  document.getElementById("email").focus();
});

signOutButton.addEventListener("click", () => {
  clearSession();
  signedInPanel.hidden = true;
  authForm.hidden = false;
  authTabs.hidden = false;
  setAuthMode("signin");
  loginTitle.textContent = "Welcome back.";
  loginIntro.textContent = "Sign in to return to your journey.";
  document.getElementById("email").focus();
});

async function restoreSession() {
  let session;
  try {
    session = JSON.parse(sessionStorage.getItem(sessionStorageKey) || "null");
  } catch (error) {
    console.error("Could not read the sign-in session:", error);
    clearSession();
    showFeedback("This browser could not access its sign-in session. Check browser storage settings.", "error");
    return;
  }
  if (!session?.accessToken || !Number.isFinite(session.expiresAt) || session.expiresAt <= Date.now()) {
    clearSession();
    return;
  }

  try {
    const result = await requestApi("/api/auth/me", {
      headers: { Authorization: "Bearer " + session.accessToken }
    });
    showSignedIn(result.user);
  } catch (error) {
    clearSession();
    showFeedback(error.message);
  }
}

async function handleVerificationLink() {
  const params = new URLSearchParams(location.hash.slice(1));
  const token = params.get("verify");
  if (!token) return false;

  history.replaceState(null, "", location.pathname + location.search);
  try {
    await requestApi("/api/auth/verify-email", {
      method: "POST",
      body: JSON.stringify({ token })
    });
    showVerificationPanel("", "Your email address is verified. You can now sign in.", true);
  } catch (error) {
    showVerificationPanel("", error.message || "This verification link could not be used. You can request another email below.");
  }
  return true;
}

handleVerificationLink().then(handled => {
  if (!handled) return restoreSession();
}).catch(error => {
  console.error("Could not process the email verification link:", error);
  showFeedback("Could not verify this email address. Please try again.", "error");
});

if ("serviceWorker" in navigator && window.isSecureContext) {
  navigator.serviceWorker.register("./sw.js").catch(error => {
    console.error("Service worker registration failed:", error);
  });
}
