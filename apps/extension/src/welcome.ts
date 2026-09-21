// Archyve Welcome Page Logic: Auth Sync, Session Detection & Settings Navigation

const SUPABASE_URL = 'https://dvxrbtopucnxjmfghhme.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2eHJidG9wdWNueGptZmdoaG1lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY0NzA4NTYsImV4cCI6MjEwMjA0Njg1Nn0.8V4PUlu3mm5g-MtClYIBoFetUe5hkD9x-UFwORwRvJo';

document.addEventListener('DOMContentLoaded', () => {
  // Navigation button
  const configureBtn = document.getElementById('configure-btn');
  if (configureBtn) {
    configureBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (chrome.runtime.openOptionsPage) {
        chrome.runtime.openOptionsPage(() => {
          if (chrome.runtime.lastError) {
            chrome.tabs.create({ url: chrome.runtime.getURL('options.html') });
          }
        });
      } else {
        chrome.tabs.create({ url: chrome.runtime.getURL('options.html') });
      }
    });
  }

  // Auth elements
  const tabSignIn = document.getElementById('tab-signin') as HTMLButtonElement;
  const tabSignUp = document.getElementById('tab-signup') as HTMLButtonElement;
  const authForm = document.getElementById('auth-form') as HTMLFormElement;
  const authEmailInput = document.getElementById('auth-email') as HTMLInputElement;
  const authPasswordInput = document.getElementById('auth-password') as HTMLInputElement;
  const authSubmitBtn = document.getElementById('auth-submit-btn') as HTMLButtonElement;
  const authSubmitText = document.getElementById('auth-submit-text') as HTMLSpanElement;
  const authStatus = document.getElementById('auth-status') as HTMLDivElement;
  const authIndicator = document.getElementById('auth-indicator') as HTMLSpanElement;
  const loggedInView = document.getElementById('logged-in-view') as HTMLDivElement;
  const loggedOutView = document.getElementById('logged-out-view') as HTMLDivElement;
  const userEmailDisplay = document.getElementById('user-email-display') as HTMLDivElement;
  const userAvatar = document.getElementById('user-avatar') as HTMLDivElement;
  const btnSignOut = document.getElementById('btn-signout') as HTMLButtonElement;

  let isSignUpMode = false;

  // Toggle Tabs
  if (tabSignIn && tabSignUp) {
    tabSignIn.addEventListener('click', () => {
      isSignUpMode = false;
      tabSignIn.classList.add('active');
      tabSignUp.classList.remove('active');
      authSubmitText.textContent = 'Sign In';
      hideStatus();
    });

    tabSignUp.addEventListener('click', () => {
      isSignUpMode = true;
      tabSignUp.classList.add('active');
      tabSignIn.classList.remove('active');
      authSubmitText.textContent = 'Create Account';
      hideStatus();
    });
  }

  function showStatus(message: string, isError: boolean) {
    if (!authStatus) return;
    authStatus.textContent = message;
    authStatus.className = `auth-status-box ${isError ? 'error' : 'success'}`;
  }

  function hideStatus() {
    if (!authStatus) return;
    authStatus.className = 'auth-status-box';
    authStatus.textContent = '';
  }

  function updateLoggedInState(email: string) {
    if (authIndicator) {
      authIndicator.textContent = 'connected';
      authIndicator.style.color = '#9ee618';
    }
    if (userEmailDisplay) userEmailDisplay.textContent = email;
    if (userAvatar) userAvatar.textContent = email.charAt(0).toLowerCase();
    if (loggedOutView) loggedOutView.style.display = 'none';
    if (loggedInView) loggedInView.style.display = 'flex';
  }

  function updateLoggedOutState() {
    if (authIndicator) {
      authIndicator.textContent = '';
    }
    if (loggedInView) loggedInView.style.display = 'none';
    if (loggedOutView) loggedOutView.style.display = 'block';
  }

  // 1. Detect existing login from extension storage or archyve.xyz cookies
  async function checkActiveSession() {
    // Check local extension storage first
    chrome.storage.local.get(['userSession'], (result) => {
      if (result.userSession?.user?.email) {
        updateLoggedInState(result.userSession.user.email);
        return;
      }

      // Check cookies for archyve.xyz if available
      if (chrome.cookies) {
        chrome.cookies.getAll({ domain: 'archyve.xyz' }, (cookies) => {
          const authCookie = cookies?.find(c => c.name.includes('auth-token') || c.name.includes('sb-'));
          if (authCookie) {
            try {
              // Parse Supabase cookie structure if present
              const decoded = decodeURIComponent(authCookie.value);
              const session = JSON.parse(decoded);
              if (session?.user?.email) {
                chrome.storage.local.set({ userSession: session });
                updateLoggedInState(session.user.email);
                return;
              }
            } catch {
              // fallback
            }
          }
          updateLoggedOutState();
        });
      } else {
        updateLoggedOutState();
      }
    });
  }

  checkActiveSession();

  // Sign out listener
  if (btnSignOut) {
    btnSignOut.addEventListener('click', async () => {
      chrome.storage.local.remove(['userSession'], () => {
        updateLoggedOutState();
        showStatus('Signed out successfully.', false);
      });
    });
  }

  // Handle Auth Form Submission (Direct Supabase API Call without external bundle bloat)
  if (authForm) {
    authForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = authEmailInput.value.trim();
      const password = authPasswordInput.value.trim();

      if (!email || !password) return;

      authSubmitBtn.disabled = true;
      authSubmitText.textContent = isSignUpMode ? 'Creating account...' : 'Signing in...';
      hideStatus();

      try {
        const endpoint = isSignUpMode
          ? `${SUPABASE_URL}/auth/v1/signup`
          : `${SUPABASE_URL}/auth/v1/token?grant_type=password`;

        const res = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({ email, password }),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error_description || data.msg || data.message || 'Authentication failed');
        }

        if (isSignUpMode) {
          showStatus('Registration successful! Please check your email to confirm or sign in.', false);
          isSignUpMode = false;
          tabSignIn.click();
        } else {
          // Store session
          chrome.storage.local.set({ userSession: data }, () => {
            updateLoggedInState(data.user?.email || email);
            showStatus('Signed in successfully!', false);
          });
        }
      } catch (err: any) {
        showStatus(err.message || 'Error occurred during authentication.', true);
      } finally {
        authSubmitBtn.disabled = false;
        authSubmitText.textContent = isSignUpMode ? 'Create Account' : 'Sign In';
      }
    });
  }
});
