"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import QRCode from "qrcode";

type Mode = "url" | "text" | "contact";

interface ContactInfo {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  org: string;
}

function buildVCard(contact: ContactInfo): string {
  const lines = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `N:${contact.lastName};${contact.firstName};;;`,
    `FN:${contact.firstName} ${contact.lastName}`.trim(),
  ];
  if (contact.org) lines.push(`ORG:${contact.org}`);
  if (contact.phone) lines.push(`TEL:${contact.phone}`);
  if (contact.email) lines.push(`EMAIL:${contact.email}`);
  lines.push("END:VCARD");
  return lines.join("\n");
}

function normalizeUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return trimmed;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export default function QRCodeGenerator() {
  const [mode, setMode] = useState<Mode>("url");
  const [url, setUrl] = useState("");
  const [text, setText] = useState("");
  const [contact, setContact] = useState<ContactInfo>({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    org: "",
  });
  const [generated, setGenerated] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const payload = useCallback(() => {
    switch (mode) {
      case "url":
        return normalizeUrl(url);
      case "text":
        return text;
      case "contact":
        return buildVCard(contact);
    }
  }, [mode, url, text, contact]);

  const isEmpty = useCallback(() => {
    switch (mode) {
      case "url":
        return !url.trim();
      case "text":
        return !text.trim();
      case "contact":
        return !contact.firstName.trim() && !contact.lastName.trim();
    }
  }, [mode, url, text, contact]);

  const generate = useCallback(async () => {
    const data = payload();
    if (!data) return;
    try {
      await QRCode.toCanvas(canvasRef.current, data, {
        width: 280,
        margin: 2,
        color: { dark: "#33ff66", light: "#0a120a" },
        errorCorrectionLevel: "M",
      });
      setGenerated(true);
    } catch {
      setGenerated(false);
    }
  }, [payload]);

  useEffect(() => {
    setGenerated(false);
  }, [mode]);

  const download = useCallback(async () => {
    const data = payload();
    if (!data) return;
    const dataUrl = await QRCode.toDataURL(data, {
      width: 600,
      margin: 2,
      color: { dark: "#000000", light: "#ffffff" },
      errorCorrectionLevel: "M",
    });
    const link = document.createElement("a");
    link.download = "qrcode.png";
    link.href = dataUrl;
    link.click();
  }, [payload]);

  const updateContact = (field: keyof ContactInfo, value: string) => {
    setContact((prev) => ({ ...prev, [field]: value }));
    setGenerated(false);
  };

  return (
    <div className="qr-body">
      <div className="qr-bezel">
        <div className="qr-screen">
          <div className="scanlines" />

          <div className="qr-content">
            <div className="qr-title">QR GENERATOR</div>

            <div className="qr-tabs">
              {(["url", "text", "contact"] as Mode[]).map((m) => (
                <button
                  key={m}
                  className={`qr-tab${mode === m ? " qr-tab-active" : ""}`}
                  onClick={() => setMode(m)}
                >
                  {m === "url" ? "URL" : m === "text" ? "TEXT" : "CONTACT"}
                </button>
              ))}
            </div>

            <div className="qr-form">
              {mode === "url" && (
                <input
                  className="qr-input"
                  type="text"
                  placeholder="https://example.com"
                  value={url}
                  onChange={(e) => {
                    setUrl(e.target.value);
                    setGenerated(false);
                  }}
                  onKeyDown={(e) => e.key === "Enter" && generate()}
                />
              )}

              {mode === "text" && (
                <textarea
                  className="qr-input qr-textarea"
                  placeholder="Enter text..."
                  value={text}
                  onChange={(e) => {
                    setText(e.target.value);
                    setGenerated(false);
                  }}
                  rows={3}
                />
              )}

              {mode === "contact" && (
                <div className="qr-contact-fields">
                  <div className="qr-contact-row">
                    <input
                      className="qr-input"
                      placeholder="First name"
                      value={contact.firstName}
                      onChange={(e) => updateContact("firstName", e.target.value)}
                    />
                    <input
                      className="qr-input"
                      placeholder="Last name"
                      value={contact.lastName}
                      onChange={(e) => updateContact("lastName", e.target.value)}
                    />
                  </div>
                  <input
                    className="qr-input"
                    placeholder="Phone"
                    value={contact.phone}
                    onChange={(e) => updateContact("phone", e.target.value)}
                  />
                  <input
                    className="qr-input"
                    type="email"
                    placeholder="Email"
                    value={contact.email}
                    onChange={(e) => updateContact("email", e.target.value)}
                  />
                  <input
                    className="qr-input"
                    placeholder="Organization"
                    value={contact.org}
                    onChange={(e) => updateContact("org", e.target.value)}
                  />
                </div>
              )}

              <button
                className="qr-generate-btn"
                onClick={generate}
                disabled={isEmpty()}
              >
                GENERATE
              </button>
            </div>

            <div className={`qr-canvas-wrap${generated ? " qr-canvas-visible" : ""}`}>
              <canvas ref={canvasRef} />
              {generated && (
                <button className="qr-download-btn" onClick={download}>
                  DOWNLOAD PNG
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="clock-footer">
        <div className="led-cluster">
          <div className="led led-on" />
          <div className="led" />
        </div>
        <span className="model-label">QR-GEN v1.0</span>
      </div>
    </div>
  );
}
