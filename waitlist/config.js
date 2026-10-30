/* Waitlist backend switch. While `endpoint` is null the form is shown in its "Opening soon" state:
   fields are disabled and nothing is collected, stored or sent.
   To go live later (after Hexan approves the provider, copy and privacy text), set ONE value:
     endpoint: 'https://example-provider/forms/xyz'   // receives a JSON POST: {email, ages: [...], interests: [...], source: 'founding-family'}
   Optional: method / headers / successMessage. */
window.ELEARNEA_WAITLIST = {
  endpoint: null,
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  successMessage: "You're on the list! We'll be in touch when founding-family spots open."
};
