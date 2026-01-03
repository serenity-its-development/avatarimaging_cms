import type { D1DatabaseGateway } from '../database/D1DatabaseGateway'

export interface EmailData {
  to: string
  subject: string
  html: string
  from?: string
}

export interface BookingConfirmationData {
  contact_name: string
  contact_email: string
  service_type: string
  scheduled_date: string
  scheduled_time: string
  booking_id: string
  notes?: string
}

export class EmailService {
  constructor(
    private env: any,
    private db: D1DatabaseGateway
  ) {}

  /**
   * Send booking confirmation email
   */
  async sendBookingConfirmation(data: BookingConfirmationData): Promise<boolean> {
    const formattedDate = new Date(data.scheduled_date).toLocaleDateString('en-AU', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    })

    const formattedTime = this.formatTime(data.scheduled_time)

    const html = this.generateBookingConfirmationHTML({
      ...data,
      formatted_date: formattedDate,
      formatted_time: formattedTime
    })

    return await this.send({
      to: data.contact_email,
      subject: `Booking Confirmation - ${data.service_type}`,
      html
    })
  }

  /**
   * Send generic email using Resend API
   */
  async send(data: EmailData): Promise<boolean> {
    try {
      // Check if Resend API key is configured
      if (!this.env.RESEND_API_KEY) {
        console.warn('RESEND_API_KEY not configured, skipping email send')
        return false
      }

      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: data.from || 'Avatar Imaging <bookings@avatarimaging.com.au>',
          to: [data.to],
          subject: data.subject,
          html: data.html
        })
      })

      if (!response.ok) {
        const error = await response.text()
        console.error('Resend API error:', error)
        return false
      }

      const result = await response.json()
      console.log('Email sent successfully:', result.id)
      return true
    } catch (error: any) {
      console.error('Failed to send email:', error)
      return false
    }
  }

  /**
   * Generate booking confirmation HTML email
   */
  private generateBookingConfirmationHTML(data: {
    contact_name: string
    service_type: string
    formatted_date: string
    formatted_time: string
    booking_id: string
    notes?: string
  }): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Booking Confirmation</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <!-- Main Container -->
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">

          <!-- Header with Logo -->
          <tr>
            <td style="background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); padding: 40px 30px; text-align: center;">
              <img src="https://crm.avatarimaging.com.au/logo.webp" alt="Avatar Imaging" style="max-width: 120px; height: auto; margin-bottom: 20px;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">Booking Confirmed!</h1>
              <p style="margin: 10px 0 0 0; color: #e0e7ff; font-size: 16px;">Your appointment has been scheduled</p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 20px 0; color: #374151; font-size: 16px; line-height: 1.6;">
                Hi ${data.contact_name},
              </p>

              <p style="margin: 0 0 30px 0; color: #374151; font-size: 16px; line-height: 1.6;">
                Thank you for booking with Avatar Imaging. We're looking forward to seeing you!
              </p>

              <!-- Appointment Details Card -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; border-radius: 8px; border-left: 4px solid #3b82f6; padding: 20px; margin-bottom: 30px;">
                <tr>
                  <td>
                    <h2 style="margin: 0 0 20px 0; color: #111827; font-size: 18px; font-weight: bold;">Appointment Details</h2>

                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding: 8px 0;">
                          <strong style="color: #6b7280; font-size: 14px;">Service:</strong>
                        </td>
                        <td style="padding: 8px 0; text-align: right;">
                          <span style="color: #111827; font-size: 14px;">${data.service_type}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0;">
                          <strong style="color: #6b7280; font-size: 14px;">Date:</strong>
                        </td>
                        <td style="padding: 8px 0; text-align: right;">
                          <span style="color: #111827; font-size: 14px;">${data.formatted_date}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0;">
                          <strong style="color: #6b7280; font-size: 14px;">Time:</strong>
                        </td>
                        <td style="padding: 8px 0; text-align: right;">
                          <span style="color: #111827; font-size: 14px;">${data.formatted_time}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0;">
                          <strong style="color: #6b7280; font-size: 14px;">Booking ID:</strong>
                        </td>
                        <td style="padding: 8px 0; text-align: right;">
                          <span style="color: #6b7280; font-size: 12px; font-family: monospace;">${data.booking_id}</span>
                        </td>
                      </tr>
                    </table>

                    ${data.notes ? `
                      <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                        <strong style="color: #6b7280; font-size: 14px;">Notes:</strong>
                        <p style="margin: 8px 0 0 0; color: #111827; font-size: 14px; line-height: 1.6;">${data.notes}</p>
                      </div>
                    ` : ''}
                  </td>
                </tr>
              </table>

              <!-- Important Information -->
              <div style="background-color: #fffbeb; border-left: 4px solid #f59e0b; border-radius: 8px; padding: 20px; margin-bottom: 30px;">
                <h3 style="margin: 0 0 10px 0; color: #92400e; font-size: 16px; font-weight: bold;">📋 Please Note</h3>
                <ul style="margin: 0; padding-left: 20px; color: #78350f; font-size: 14px; line-height: 1.6;">
                  <li>Please arrive 10 minutes early</li>
                  <li>Bring your Medicare card and any referrals</li>
                  <li>If you need to reschedule, please call us at least 24 hours in advance</li>
                </ul>
              </div>

              <!-- CTA Buttons -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 30px;">
                <tr>
                  <td align="center">
                    <a href="https://avatarimaging.com.au/contact" style="display: inline-block; background-color: #3b82f6; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 6px; font-size: 16px; font-weight: bold; margin: 0 10px;">Contact Us</a>
                    <a href="https://book.avatarimaging.com.au" style="display: inline-block; background-color: #ffffff; color: #3b82f6; text-decoration: none; padding: 14px 28px; border-radius: 6px; font-size: 16px; font-weight: bold; border: 2px solid #3b82f6; margin: 0 10px;">Book Another</a>
                  </td>
                </tr>
              </table>

              <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                If you have any questions, please don't hesitate to contact us.
              </p>

              <p style="margin: 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                Best regards,<br>
                <strong style="color: #111827;">Avatar Imaging Team</strong>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 14px;">
                <strong>Avatar Imaging</strong><br>
                Medical Imaging & Skin Cancer Screening
              </p>
              <p style="margin: 0 0 15px 0; color: #9ca3af; font-size: 12px;">
                📞 (02) XXXX XXXX | 📧 bookings@avatarimaging.com.au<br>
                📍 Your Location Here
              </p>
              <p style="margin: 0; color: #9ca3af; font-size: 11px;">
                © ${new Date().getFullYear()} Avatar Imaging. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim()
  }

  /**
   * Format time string (HH:MM to 12-hour format)
   */
  private formatTime(time: string): string {
    const [hour, minute] = time.split(':')
    const h = parseInt(hour)
    const ampm = h >= 12 ? 'PM' : 'AM'
    const displayHour = h > 12 ? h - 12 : h === 0 ? 12 : h
    return `${displayHour}:${minute} ${ampm}`
  }
}
