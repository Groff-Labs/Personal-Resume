// Testimonials / LinkedIn recommendations.
// Replace the placeholder entries with actual text pulled from LinkedIn.
// To hide the section entirely, set `showTestimonials = false` below.

export interface Testimonial {
  quote: string;
  name: string;
  role: string;
  // Two short tags describing the working relationship, e.g. "Former colleague · AllCloud"
  context?: string;
  // Optional LinkedIn profile URL
  linkedInUrl?: string;
}

// Flip to `true` when real LinkedIn recommendations are pasted below.
// While false, the entire Testimonials section is hidden from the page.
export const showTestimonials = false;

export const testimonials: Testimonial[] = [
  {
    // PLACEHOLDER — paste a real LinkedIn recommendation here
    quote:
      "Michael is one of those rare AWS architects who can both draw the diagram and ship the CDK behind it. He made our cloud migration feel like a solved problem instead of a spreadsheet.",
    name: "Jane Placeholder",
    role: "Director of Engineering",
    context: "Former colleague · AllCloud",
  },
  {
    // PLACEHOLDER — paste a real LinkedIn recommendation here
    quote:
      "Calm under fire, writes docs people actually read, and is genuinely invested in the customer's success beyond the statement of work. Easy recommendation.",
    name: "John Placeholder",
    role: "Principal Solutions Architect",
    context: "Client · Innovative Solutions engagement",
  },
];
