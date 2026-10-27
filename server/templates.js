import { defaultConfig } from './defaults.js';
import { randomBytes } from 'node:crypto';

const sid = () => 's_' + randomBytes(4).toString('hex');

export const TEMPLATES = {
  blank: { name: 'Blank agent', description: 'Start from scratch with sensible defaults.', build: (n) => defaultConfig(n) },
  support: {
    name: 'Customer support',
    description: 'Answers FAQs from your knowledge, tracks orders and hands tough cases to your team.',
    build(n) {
      const c = defaultConfig(n, `You are ${n}, the support assistant for our store. You help customers with orders, shipping, returns and account questions.`);
      c.suggestions = ['Where is my order?', 'What is your return policy?', 'Talk to a human'];
      c.knowledge = [
        { id: sid(), type: 'faq', question: 'What is your return policy?', answer: 'You can return any unused item within 30 days of delivery for a full refund. Start a return from your account page or ask me to help.' },
        { id: sid(), type: 'faq', question: 'How long does shipping take?', answer: 'Standard shipping takes 3–5 business days. Express shipping arrives in 1–2 business days.' },
        { id: sid(), type: 'faq', question: 'Do you ship internationally?', answer: 'Yes, we ship to over 40 countries. International orders usually arrive in 7–14 business days.' },
      ];
      c.playbooks = [{
        id: sid(), name: 'Track an order', enabled: true, description: 'Collect the order number and email, then look up the order status.',
        triggers: ['where is my order', 'track my order', 'order status'],
        steps: [
          { id: 'ask_order', type: 'ask', text: 'Sure, I can check that. What is your order number?', variable: 'orderNumber', validate: 'any' },
          { id: 'ask_email', type: 'ask', text: 'Thanks! And the email you used at checkout?', variable: 'email', validate: 'email', retryMessage: 'Hmm, that email doesn\'t look valid. Could you type it again?' },
          { id: 'reply', type: 'message', text: 'Order {{orderNumber}} for {{email}} is on its way and should arrive within 2 business days. Anything else?' },
          { id: 'done', type: 'end' },
        ],
      }];
      return c;
    },
  },
  leads: {
    name: 'Lead capture',
    description: 'Qualifies visitors, captures contact details and books a call with sales.',
    build(n) {
      const c = defaultConfig(n, `You are ${n}, a friendly sales assistant. You answer product questions and help interested visitors book a demo.`);
      c.suggestions = ['Book a demo', 'Pricing', 'What does it do?'];
      c.playbooks = [{
        id: sid(), name: 'Book a demo', enabled: true, description: 'Qualify the lead and collect their name, email and team size.',
        triggers: ['book a demo', 'demo', 'talk to sales'],
        steps: [
          { id: 'name', type: 'ask', text: 'Great! What\'s your name?', variable: 'name' },
          { id: 'email', type: 'ask', text: 'Nice to meet you, {{name}}. What\'s your work email?', variable: 'email', validate: 'email' },
          { id: 'size', type: 'ask', text: 'How big is your team?', variable: 'teamSize', choices: ['1–10', '11–50', '51–200', '200+'] },
          { id: 'check', type: 'condition', variable: 'teamSize', operator: 'equals', value: '200+', then: 'enterprise', else: 'standard' },
          { id: 'enterprise', type: 'handoff', text: 'Thanks {{name}}! An enterprise specialist will reach out to {{email}} today.' },
          { id: 'standard', type: 'message', text: 'Thanks {{name}}! We\'ve sent a booking link to {{email}}.' },
          { id: 'end', type: 'end' },
        ],
      }];
      return c;
    },
  },
  booking: {
    name: 'Appointment booking',
    description: 'Books, moves and cancels appointments for clinics, salons and services.',
    build(n) {
      const c = defaultConfig(n, `You are ${n}, the booking assistant for a local clinic. You help patients book, reschedule or cancel appointments.`);
      c.suggestions = ['Book an appointment', 'Opening hours', 'Cancel my booking'];
      c.knowledge = [{ id: sid(), type: 'faq', question: 'What are your opening hours?', answer: 'We are open Monday to Friday 8am–6pm and Saturday 9am–1pm.' }];
      c.playbooks = [{
        id: sid(), name: 'Book an appointment', enabled: true, description: 'Collect service, preferred day and phone number.',
        triggers: ['book an appointment', 'make a booking', 'appointment'],
        steps: [
          { id: 'svc', type: 'ask', text: 'Which service would you like?', variable: 'service', choices: ['Check-up', 'Dental cleaning', 'Consultation'] },
          { id: 'day', type: 'ask', text: 'What day works best for you?', variable: 'day' },
          { id: 'phone', type: 'ask', text: 'And a phone number to confirm by SMS?', variable: 'phone', validate: 'phone' },
          { id: 'ok', type: 'message', text: 'You\'re booked for a {{service}} on {{day}}. We\'ll text {{phone}} to confirm.' },
          { id: 'end', type: 'end' },
        ],
      }];
      return c;
    },
  },
};
