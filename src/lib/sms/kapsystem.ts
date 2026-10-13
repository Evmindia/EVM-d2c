import 'server-only';

/**
 * Kapsystem SMS gateway (India, DLT-registered) — SERVER ONLY.
 *
 * Sends transactional SMS via a simple HTTP GET. All credentials + DLT ids are
 * env-driven. The OTP message body MUST match the DLT-approved content template
 * exactly — set KAPSYSTEM_OTP_TEMPLATE to that text with a `{otp}` placeholder.
 */
import { AppError } from '@/lib/security/errors';
import { logger } from '@/lib/logger';

function env(name: string, fallback = ''): string {
  return (process.env[name] ?? fallback).trim();
}

interface KapConfig {
  baseUrl: string;
  username: string;
  password: string;
  from: string;
  dltContentTemplateId: string;
  dltPrincipalEntityId: string;
  dltTelemarketerId: string;
  otpTemplate: string; // must match the DLT template; contains `{otp}`
}

function kapConfig(): KapConfig {
  return {
    baseUrl: env('KAPSYSTEM_BASE_URL', 'https://api.kapsystem.com/sms/1/text/query'),
    username: env('KAPSYSTEM_USERNAME'),
    password: env('KAPSYSTEM_PASSWORD'),
    from: env('KAPSYSTEM_FROM'),
    dltContentTemplateId: env('KAPSYSTEM_DLT_CONTENT_TEMPLATE_ID'),
    dltPrincipalEntityId: env('KAPSYSTEM_DLT_PRINCIPAL_ENTITY_ID'),
    dltTelemarketerId: env('KAPSYSTEM_DLT_TELEMARKETER_ID'),
    otpTemplate: env('KAPSYSTEM_OTP_TEMPLATE', 'Your EVM OTP is {otp}. Valid for 5 minutes. Do not share it.'),
  };
}

export function isKapsystemConfigured(): boolean {
  const c = kapConfig();
  return Boolean(c.username && c.password && c.from && c.dltContentTemplateId);
}

/** `to` must be digits with country code, e.g. 919812345678 (no '+'). */
function toGatewayNumber(phoneE164: string): string {
  return phoneE164.replace(/\D/g, ''); // +919812345678 -> 919812345678
}

/** Send an OTP SMS. Throws AppError on failure; never logs the code. */
export async function sendOtpSms(phoneE164: string, code: string): Promise<void> {
  if (!isKapsystemConfigured()) {
    throw new AppError('internal_error', { internal: 'Kapsystem SMS is not configured' });
  }
  const c = kapConfig();
  const text = c.otpTemplate.replaceAll('{otp}', code).replaceAll('{#var#}', code);

  const url = new URL(c.baseUrl);
  url.searchParams.set('username', c.username);
  url.searchParams.set('password', c.password);
  url.searchParams.set('from', c.from);
  url.searchParams.set('to', toGatewayNumber(phoneE164));
  url.searchParams.set('text', text);
  url.searchParams.set('indiaDltContentTemplateId', c.dltContentTemplateId);
  if (c.dltPrincipalEntityId) url.searchParams.set('indiaDltPrincipalEntityId', c.dltPrincipalEntityId);
  if (c.dltTelemarketerId) url.searchParams.set('indiaDltTelemarketerId', c.dltTelemarketerId);

  let res: Response;
  try {
    res = await fetch(url.toString(), { method: 'GET' });
  } catch (err) {
    logger.error('kapsystem_network_error', { err: String(err) });
    throw new AppError('internal_error', { internal: 'SMS send failed (network)' });
  }

  const body = await res.text();
  // Kapsystem returns a status payload; a non-2xx or an error keyword means failure.
  if (!res.ok || /error|invalid|failed|reject/i.test(body)) {
    logger.error('kapsystem_send_error', { status: res.status, body: body.slice(0, 200) });
    throw new AppError('internal_error', { internal: `SMS send failed (${res.status}): ${body.slice(0, 100)}` });
  }
  logger.info('otp_sms_sent', { status: res.status, body: body.slice(0, 300) }); // never log phone or code
}
