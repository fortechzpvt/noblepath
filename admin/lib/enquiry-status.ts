/** Enquiry workflow states and the badge colour each shows with (D-36). */
export const STATUS_TONE = { new: "amber", contacted: "neutral", confirmed: "green", closed: "neutral" } as const;
export type EnquiryStatus = keyof typeof STATUS_TONE;
