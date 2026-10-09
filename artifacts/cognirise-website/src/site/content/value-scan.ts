import type { Cta, PageMeta } from "./types";

export const VALUE_SCAN_META: PageMeta = {
  title: "Book a Value Scan | Cognirise",
  description:
    "One day with your team on one process. You leave with the opportunity, the constraints, the data it needs and a business case. Book the session here.",
};

export const VALUE_SCAN_HERO = {
  title: "One day. One process. A business case.",
  lead: "Bring us one process where the work gets stuck. In one day with your team we find where AI helps and what it is worth.",
  primary: { label: "Book the session", href: "#book" } as Cta,
  image: { src: "/images/cognirise/site-services.jpg", alt: "A violet and coral current moving through a bright architectural environment." },
};

export const VALUE_SCAN_FACTS = [
  { label: "Format", value: "one working day, in the room with your team" },
  { label: "Starting point", value: "one process with a known problem" },
  { label: "Where", value: "your office, in the UAE first; remote where that is not practical" },
];

export const VALUE_SCAN_DAY = {
  heading: "What happens in the day",
  steps: [
    { title: "Frame the work.", body: "We name the process, the problem, the owners and the decision that matters now." },
    { title: "Trace the constraints.", body: "We see where hand-offs, data, systems and controls hold the work in place." },
    { title: "Shape the change.", body: "We work out where people, engineering and agents can change how the work runs." },
    { title: "Make the case.", body: "You leave with a value hypothesis, a delivery path and the questions to resolve next." },
  ],
};

export const VALUE_SCAN_WHO = {
  heading: "Who should be there",
  items: [
    { title: "The sponsor", body: "who owns the outcome" },
    { title: "The process or operations lead", body: "who knows how the work really runs" },
    { title: "A technology, data or risk counterpart", body: "who knows the systems and the rules" },
  ],
};

export const VALUE_SCAN_LEAVE = {
  heading: "What you leave with",
  items: [
    { title: "The opportunity.", body: "A focused value hypothesis with the figures behind it" },
    { title: "The path.", body: "A practical route to a working system, with its steps and timings" },
    { title: "The decisions.", body: "The open questions, each with an owner" },
  ],
};

export const VALUE_SCAN_FORM = {
  heading: "Book the session",
  intro: "There is no need to prepare a polished brief. A plain description of where the work gets stuck is enough.",
  fields: {
    name: { label: "Name", placeholder: "Your name" },
    email: { label: "Work email", placeholder: "name@company.com" },
    company: { label: "Company or organisation", placeholder: "Your organisation" },
    area: { label: "Area", options: ["Advise", "Build", "Run", "Not sure yet"] },
    process: { label: "The process", placeholder: "Describe the process and where it gets stuck" },
    decides: { label: "Who decides", placeholder: "The person who owns this process today", optional: true },
    consent: { label: "I agree that Cognirise may contact me about this request.", link: { label: "Privacy notice", href: "/privacy" } as Cta },
  },
  submit: "Send the request",
  after: "After you send it, we reply to agree a date.",
  errors: {
    required: "Complete the required fields and tick the consent box.",
    processShort: "Tell us a little more about the process: at least a sentence.",
    failed: "The request could not be sent. Please try again, or write to support@cognirise.ai.",
  },
  success: {
    heading: "Thank you. We have your request.",
    body: "We reply to agree a date. If you do not hear from us within a few working days, write to support@cognirise.ai.",
  },
};
