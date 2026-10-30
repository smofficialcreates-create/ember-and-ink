/**
 * Form handling contract.
 *
 * When `PUBLIC_CONTACT_FORM_ENDPOINT` / `PUBLIC_NEWSLETTER_FORM_ENDPOINT`
 * are set (Formspree, Buttondown, ConvertKit, …), forms POST directly to
 * them. When they are absent, the UI renders an accessible mailto
 * fallback so the site is fully usable before any backend is wired up.
 */
import {
  PUBLIC_CONTACT_FORM_ENDPOINT,
  PUBLIC_NEWSLETTER_FORM_ENDPOINT,
} from 'astro:env/client';

export const CONTACT_ENDPOINT = PUBLIC_CONTACT_FORM_ENDPOINT ?? null;
export const NEWSLETTER_ENDPOINT = PUBLIC_NEWSLETTER_FORM_ENDPOINT ?? null;

/** Shape of a single form field descriptor. */
export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'textarea';
  required?: boolean;
  autocomplete?: string;
  placeholder?: string;
}

/** Field descriptors for the contact form. */
export const CONTACT_FIELDS: ReadonlyArray<FormField> = [
  {
    name: 'name',
    label: 'Your name',
    type: 'text',
    required: true,
    autocomplete: 'name',
  },
  {
    name: 'email',
    label: 'Email',
    type: 'email',
    required: true,
    autocomplete: 'email',
    placeholder: 'you@example.com',
  },
  {
    name: 'message',
    label: 'Message',
    type: 'textarea',
    required: true,
    placeholder: 'Tell us what you are thinking…',
  },
];