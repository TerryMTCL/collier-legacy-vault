import { Resend } from 'resend'

function getResend(): Resend {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    throw new Error('RESEND_API_KEY environment variable is not set')
  }
  return new Resend(apiKey)
}

const ADMIN_EMAIL = 'joshua@middletnchristmaslights.com'
const FROM_EMAIL = process.env.FROM_EMAIL ?? 'noreply@collierlegacyvault.com'
const APP_URL = process.env.APP_URL ?? 'https://collierlegacyvault.com'

export async function sendSwitchTriggerEmail(personName: string, cancelLink: string): Promise<void> {
  const resend = getResend()

  await resend.emails.send({
    from: FROM_EMAIL,
    to: ADMIN_EMAIL,
    subject: `[ACTION REQUIRED] Dead Man's Switch Triggered — ${personName}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4f46e5;">Dead Man's Switch Alert</h2>
        <p>A verification has been submitted by <strong>${personName}</strong>.</p>
        <p>The switch will execute and grant vault access in <strong>24 hours</strong> unless you cancel it.</p>
        <p>If this was unauthorized or you are still alive and this was a test, click the button below to cancel:</p>
        <div style="margin: 32px 0;">
          <a href="${cancelLink}"
             style="background-color: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">
            Cancel This Switch Event
          </a>
        </div>
        <p style="color: #6b7280; font-size: 14px;">
          Cancel link: <a href="${cancelLink}">${cancelLink}</a>
        </p>
        <p style="color: #6b7280; font-size: 14px;">
          If you do not cancel within 24 hours, vault access will be automatically granted.
        </p>
      </div>
    `,
  })
}

export async function sendAccessGrantedEmail(personEmail: string, activationLink: string): Promise<void> {
  const resend = getResend()

  await resend.emails.send({
    from: FROM_EMAIL,
    to: personEmail,
    subject: 'You have been granted access to the Collier Legacy Vault',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4f46e5;">Vault Access Granted</h2>
        <p>You have been granted access to the Collier Legacy Vault.</p>
        <p>Click the button below to access your information:</p>
        <div style="margin: 32px 0;">
          <a href="${activationLink}"
             style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">
            Access the Vault
          </a>
        </div>
        <p style="color: #6b7280; font-size: 14px;">
          Access link: <a href="${activationLink}">${activationLink}</a>
        </p>
        <p style="color: #6b7280; font-size: 14px;">
          This link will remain active. Please keep it secure.
        </p>
      </div>
    `,
  })
}

export async function sendPersonalMessageEmail(
  personEmail: string,
  personalMessage: string,
  activationLink: string
): Promise<void> {
  const resend = getResend()

  await resend.emails.send({
    from: FROM_EMAIL,
    to: personEmail,
    subject: 'A personal message and important information for you',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4f46e5;">A Message For You</h2>
        <div style="background-color: #f9fafb; padding: 24px; border-radius: 8px; margin: 24px 0; white-space: pre-wrap;">
          ${personalMessage.replace(/\n/g, '<br>')}
        </div>
        <p>You have also been granted access to the Legacy Vault, which contains important information for you.</p>
        <div style="margin: 32px 0;">
          <a href="${activationLink}"
             style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">
            Access the Vault
          </a>
        </div>
        <p style="color: #6b7280; font-size: 14px;">
          Access link: <a href="${activationLink}">${activationLink}</a>
        </p>
      </div>
    `,
  })
}

export { APP_URL }
