import { useState } from "react";
import { profile } from "../data/content.js";

/**
 * A minimal "message me" box. Posts to FormSubmit's AJAX endpoint (no backend,
 * no API key, free) which emails the message to `profile.email`. On the very
 * first submission FormSubmit sends a one-time activation link to that inbox.
 * A hidden honeypot field (`_honey`) filters out bots.
 */
const ENDPOINT = `https://formsubmit.co/ajax/${profile.email}`;

export default function ContactForm() {
  const [status, setStatus] = useState("idle"); // idle | sending | sent | error
  const [error, setError] = useState("");

  const onSubmit = async (e) => {
    e.preventDefault();
    if (status === "sending") return;
    const form = e.currentTarget;
    const data = new FormData(form);
    if (data.get("_honey")) return; // bot
    setStatus("sending");
    setError("");
    try {
      const res = await fetch(ENDPOINT, {
        method: "POST",
        headers: { Accept: "application/json" },
        body: data,
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok && (json.success === "true" || json.success === true || res.status === 200)) {
        setStatus("sent");
        form.reset();
      } else {
        throw new Error(json.message || "Something went wrong.");
      }
    } catch (err) {
      setStatus("error");
      setError(err.message || "Couldn't send — try emailing me directly.");
    }
  };

  if (status === "sent") {
    return (
      <div className="cform cform--done" role="status">
        <span className="cform__check">✓</span>
        <p>Thanks — your message is on its way. I'll get back to you soon.</p>
      </div>
    );
  }

  return (
    <form className="cform" onSubmit={onSubmit} noValidate>
      <input type="hidden" name="_subject" value="New message from your portfolio" />
      <input type="hidden" name="_template" value="table" />
      <input type="text" name="_honey" tabIndex={-1} autoComplete="off" className="cform__honey" aria-hidden="true" />

      <div className="cform__field">
        <label htmlFor="cf-email">Your email</label>
        <input
          id="cf-email"
          type="email"
          name="email"
          required
          placeholder="you@company.com"
          autoComplete="email"
          data-cursor
        />
      </div>

      <div className="cform__field">
        <label htmlFor="cf-msg">Message</label>
        <textarea
          id="cf-msg"
          name="message"
          required
          rows={4}
          placeholder="Tell me about the role, project, or just say hi."
          data-cursor
        />
      </div>

      <div className="cform__actions">
        <button
          type="submit"
          className="btn-pill btn-pill--accent"
          disabled={status === "sending"}
          data-cursor
          data-sound
        >
          {status === "sending" ? "Sending…" : "Send message →"}
        </button>
        {status === "error" && <span className="cform__error">{error}</span>}
      </div>
    </form>
  );
}
